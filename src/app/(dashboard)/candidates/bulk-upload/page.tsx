"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { extractTextFromPDF } from "@/lib/parse-pdf"
import { parseResumeWithAI } from "@/app/actions/parse-resume"
import { parseResumeText } from "@/lib/extract-info"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { UploadCloud, CheckCircle2, XCircle, Loader2, Trash2 } from "lucide-react"

type BulkCandidate = {
  id: string
  file: File
  fullName: string
  email: string
  phone: string
  occupation: string
  experienceYears: number
  skills: string
  status: "pending" | "uploading" | "success" | "error"
  errorMsg?: string
}

const MAX_FILES = 10
const MAX_FILE_SIZE = 10000000 // 10MB

export default function BulkUploadPage() {
  const [candidates, setCandidates] = useState<BulkCandidate[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    if (candidates.length + files.length > MAX_FILES) {
      toast.error(`You can only process up to ${MAX_FILES} resumes at once.`)
      return
    }

    setIsProcessing(true)
    const newCandidates: BulkCandidate[] = []

    for (const file of files) {
      if (file.type !== "application/pdf") {
        toast.error(`Skipped ${file.name} (Not a PDF)`)
        continue
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`Skipped ${file.name} (Exceeds 10MB)`)
        continue
      }

      try {
        const text = await extractTextFromPDF(file)
        const result = await parseResumeWithAI(text)
        
        if (result.error) {
          console.warn(`Gemini failed for ${file.name}, using regex fallback:`, result.error)
          toast.warning(`${file.name}: AI busy. Falling back to local parser.`)
          
          const info = parseResumeText(text)
          newCandidates.push({
            id: Math.random().toString(36).substring(2, 9),
            file,
            fullName: info.name || "",
            email: info.email || "",
            phone: info.phone || "",
            occupation: "",
            experienceYears: 0,
            skills: "",
            status: "pending"
          })
          continue
        }

        const info = result.data
        if (info) {
          newCandidates.push({
            id: Math.random().toString(36).substring(2, 9),
            file,
            fullName: info.fullName || "",
            email: info.email || "",
            phone: info.phone || "",
            occupation: info.occupation || "",
            experienceYears: info.experienceYears || 0,
            skills: (info.skills || []).join(", "),
            status: "pending"
          })
        }
      } catch (err) {
        console.error(`Failed to parse ${file.name}`, err)
        toast.error(`Could not parse ${file.name}`)
      }
    }

    setCandidates(prev => [...prev, ...newCandidates])
    setIsProcessing(false)
    // Clear input
    e.target.value = ""
  }

  const handleFieldChange = (id: string, field: keyof BulkCandidate, value: any) => {
    setCandidates(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c))
  }

  const handleRemove = (id: string) => {
    setCandidates(prev => prev.filter(c => c.id !== id))
  }

  const handleSaveAll = async () => {
    // Validate
    const invalid = candidates.find(c => !c.fullName || !c.email || !c.phone || !c.occupation)
    if (invalid) {
      toast.error("Please fill in all required fields (Name, Email, Phone, Occupation) for all candidates.")
      return
    }

    // Auth Check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error("You must be logged in as an authenticated user to save candidates. Please log in first.")
      return
    }

    setIsUploading(true)
    let successCount = 0

    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i]
      if (candidate.status === "success") continue

      setCandidates(prev => prev.map(c => c.id === candidate.id ? { ...c, status: "uploading" } : c))

      try {
        // 1. Duplicate Check
        const { data: existing } = await supabase
          .from('candidates')
          .select('id')
          .or(`email.eq.${candidate.email},phone.eq.${candidate.phone}`)
          .limit(1)
          .single()

        if (existing) {
          throw new Error("Duplicate email or phone")
        }

        // 2. Upload PDF
        const fileExt = 'pdf'
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`
        const filePath = `${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('candidate-resumes')
          .upload(filePath, candidate.file)

        if (uploadError) throw new Error("Resume upload failed")

        const { data: publicUrlData } = supabase.storage
          .from('candidate-resumes')
          .getPublicUrl(filePath)

        // 3. Insert Record
        const skillsArray = candidate.skills.split(',').map(s => s.trim()).filter(Boolean)

        const { error: insertError } = await supabase
          .from('candidates')
          .insert({
            full_name: candidate.fullName,
            occupation: candidate.occupation,
            experience_years: candidate.experienceYears,
            email: candidate.email,
            phone: candidate.phone,
            skills: skillsArray,
            resume_url: publicUrlData.publicUrl,
            resume_filename: candidate.file.name,
          })

        if (insertError) throw new Error("Database insert failed")

        setCandidates(prev => prev.map(c => c.id === candidate.id ? { ...c, status: "success" } : c))
        successCount++
      } catch (err: any) {
        setCandidates(prev => prev.map(c => c.id === candidate.id ? { ...c, status: "error", errorMsg: err.message } : c))
      }
    }

    setIsUploading(false)
    if (successCount > 0) {
      toast.success(`Successfully added ${successCount} candidates!`)
      if (successCount === candidates.length) {
        setTimeout(() => {
          router.push('/candidates')
          router.refresh()
        }, 1500)
      }
    }
  }

  return (
    <div className="max-w-6xl mx-auto pb-10 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Bulk Upload Resumes</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-2">
          Upload up to {MAX_FILES} PDF resumes at once. The system will extract basic information to speed up entry.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center w-full">
            <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-40 border-2 border-zinc-300 border-dashed rounded-lg cursor-pointer bg-zinc-50 dark:hover:bg-bray-800 dark:bg-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:border-zinc-500 dark:hover:bg-zinc-800 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                {isProcessing ? (
                  <Loader2 className="w-8 h-8 mb-4 text-zinc-500 animate-spin" />
                ) : (
                  <UploadCloud className="w-8 h-8 mb-4 text-zinc-500 dark:text-zinc-400" />
                )}
                <p className="mb-2 text-sm text-zinc-500 dark:text-zinc-400">
                  <span className="font-semibold">{isProcessing ? "Extracting data..." : "Click to select or drag and drop"}</span>
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">PDF up to 10MB</p>
              </div>
              <input 
                id="dropzone-file" 
                type="file" 
                className="hidden" 
                multiple 
                accept="application/pdf"
                onChange={handleFilesSelected}
                disabled={isProcessing || isUploading}
              />
            </label>
          </div>
        </CardContent>
      </Card>

      {candidates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Review Extracted Data</CardTitle>
            <CardDescription>Verify and correct the extracted information before saving.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[150px]">File</TableHead>
                    <TableHead>Full Name *</TableHead>
                    <TableHead>Email *</TableHead>
                    <TableHead>Phone *</TableHead>
                    <TableHead>Occupation *</TableHead>
                    <TableHead className="w-[100px]">Exp (Yrs) *</TableHead>
                    <TableHead>Skills</TableHead>
                    <TableHead className="w-[80px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {candidates.map((candidate) => (
                    <TableRow key={candidate.id}>
                      <TableCell className="text-sm truncate max-w-[150px]" title={candidate.file.name}>
                        {candidate.file.name}
                      </TableCell>
                      <TableCell>
                        <Input 
                          value={candidate.fullName} 
                          onChange={(e) => handleFieldChange(candidate.id, "fullName", e.target.value)}
                          disabled={candidate.status === "uploading" || candidate.status === "success"}
                          className="h-8 text-sm"
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="email"
                          value={candidate.email} 
                          onChange={(e) => handleFieldChange(candidate.id, "email", e.target.value)}
                          disabled={candidate.status === "uploading" || candidate.status === "success"}
                          className="h-8 text-sm"
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          value={candidate.phone} 
                          onChange={(e) => handleFieldChange(candidate.id, "phone", e.target.value)}
                          disabled={candidate.status === "uploading" || candidate.status === "success"}
                          className="h-8 text-sm"
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          placeholder="e.g. Developer"
                          value={candidate.occupation} 
                          onChange={(e) => handleFieldChange(candidate.id, "occupation", e.target.value)}
                          disabled={candidate.status === "uploading" || candidate.status === "success"}
                          className="h-8 text-sm"
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="number"
                          min="0"
                          value={candidate.experienceYears} 
                          onChange={(e) => handleFieldChange(candidate.id, "experienceYears", parseInt(e.target.value) || 0)}
                          disabled={candidate.status === "uploading" || candidate.status === "success"}
                          className="h-8 text-sm w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          placeholder="Comma separated"
                          value={candidate.skills} 
                          onChange={(e) => handleFieldChange(candidate.id, "skills", e.target.value)}
                          disabled={candidate.status === "uploading" || candidate.status === "success"}
                          className="h-8 text-sm"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        {candidate.status === "success" && <CheckCircle2 className="w-5 h-5 text-green-500 inline" />}
                        {candidate.status === "uploading" && <Loader2 className="w-5 h-5 text-blue-500 animate-spin inline" />}
                        {candidate.status === "error" && (
                          <div className="flex items-center gap-2" title={candidate.errorMsg}>
                            <XCircle className="w-5 h-5 text-red-500 inline cursor-help" />
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-400 hover:text-red-500" onClick={() => handleRemove(candidate.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                        {candidate.status === "pending" && (
                           <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-400 hover:text-red-500" onClick={() => handleRemove(candidate.id)}>
                             <Trash2 className="w-4 h-4" />
                           </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end gap-4 mt-6">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setCandidates([])}
                disabled={isUploading}
              >
                Clear All
              </Button>
              <Button onClick={handleSaveAll} disabled={isUploading || candidates.every(c => c.status === "success")}>
                {isUploading ? "Uploading..." : "Save All Candidates"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
