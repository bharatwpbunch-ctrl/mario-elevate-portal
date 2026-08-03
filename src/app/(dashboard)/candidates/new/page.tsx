"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { extractTextFromPDF } from "@/lib/parse-pdf"
import { parseResumeWithAI, parseResumeImageWithAI } from "@/app/actions/parse-resume"
import { parseResumeText } from "@/lib/extract-info"
import { extractTextFromWord } from "@/lib/parse-word"
import { readFileAsBase64 } from "@/lib/read-file"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { UploadCloud, CheckCircle2, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

const MAX_FILE_SIZE = 10000000 // 10MB
const ACCEPTED_FILE_TYPES = ["application/pdf"]

const formSchema = z.object({
  fullName: z.string().min(2, "Name is required"),
  occupation: z.string().min(2, "Occupation is required"),
  experienceYears: z.coerce.number().min(0, "Experience years is required"),
  currentCompany: z.string().optional(),
  currentDesignation: z.string().optional(),
  location: z.string().optional(),
  preferredLocation: z.string().optional(),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number is required"),
  skills: z.string().min(1, "At least one skill is required"),
  remarks: z.string().optional(),
  noticePeriod: z.string().optional(),
  currentCtc: z.string().optional(),
  expectedCtc: z.string().optional(),
  status: z.enum(["New", "Interested", "Shortlisted", "Interview lineup", "Offered", "Rejected", "On Hold", "Joined"]).default("New"),
  offeredCtc: z.string().optional(),
  jobType: z.string().optional(),
})

export default function AddCandidatePage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [isExtracting, setIsExtracting] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      fullName: "",
      occupation: "",
      experienceYears: 0,
      currentCompany: "",
      currentDesignation: "",
      location: "",
      preferredLocation: "",
      email: "",
      phone: "",
      skills: "",
      remarks: "",
      noticePeriod: "",
      currentCtc: "",
      expectedCtc: "",
      status: "New",
      offeredCtc: "",
      jobType: "",
    },
  })

  const watchStatus = form.watch("status")

  const handleResumeFile = async (file: File) => {
    const isWord = file.name.endsWith(".docx") || file.name.endsWith(".doc") || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || file.type === "application/msword";
    const isPdf = file.type === "application/pdf" || file.name.endsWith(".pdf");
    const isImage = file.type.startsWith("image/") || file.name.endsWith(".png") || file.name.endsWith(".jpg") || file.name.endsWith(".jpeg");

    if (!isPdf && !isWord && !isImage) {
      toast.error("Please select a valid PDF, Word, or Image file")
      setResumeFile(null)
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File size exceeds 10MB limit")
      setResumeFile(null)
      return
    }
    setResumeFile(file)
    
    try {
      setIsExtracting(true)
      let text = ""
      let result: { data?: any; error?: string } = {}

      if (isPdf) {
        text = await extractTextFromPDF(file)
        result = await parseResumeWithAI(text)
      } else if (isWord) {
        text = await extractTextFromWord(file)
        result = await parseResumeWithAI(text)
      } else if (isImage) {
        const base64 = await readFileAsBase64(file)
        result = await parseResumeImageWithAI(base64, file.type)
      }
      
      if (result.error) {
        console.warn("AI extraction failed, using regex fallback:", result.error)
        toast.warning("AI parser is busy. Falling back to local backup parser for basic details.")
        
        const info = parseResumeText(text)
        let updated = false
        if (info.name) {
          form.setValue('fullName', info.name)
          updated = true
        }
        if (info.email) {
          form.setValue('email', info.email)
          updated = true
        }
        if (info.phone) {
          form.setValue('phone', info.phone)
          updated = true
        }
        
        if (!updated) {
          toast.error("Could not extract any details from resume. Please fill manually.")
        }
        return
      }
      
      const info = result.data
      if (info) {
        if (info.fullName) form.setValue('fullName', info.fullName)
        if (info.email) form.setValue('email', info.email)
        if (info.phone) form.setValue('phone', info.phone)
        if (info.occupation) form.setValue('occupation', info.occupation)
        if (info.experienceYears !== undefined) form.setValue('experienceYears', info.experienceYears)
        if (info.currentCompany) form.setValue('currentCompany', info.currentCompany)
        if (info.currentDesignation) form.setValue('currentDesignation', info.currentDesignation)
        if (info.location) form.setValue('location', info.location)
        if (info.preferredLocation) form.setValue('preferredLocation', info.preferredLocation)
        if (info.skills && info.skills.length > 0) {
          form.setValue('skills', info.skills.join(', '))
        }
        toast.success("AI successfully extracted details from resume!")
      }
    } catch (err) {
      console.error("Failed to parse resume", err)
      toast.error("Could not parse resume automatically. Please enter details manually.")
    } finally {
      setIsExtracting(false)
    }
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!resumeFile) {
      toast.error("Please upload a resume (PDF, Word, or Image)")
      return
    }

    setIsSubmitting(true)
    try {
      // 0. Auth Check
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error("You must be logged in to save candidates. Please log in first.")
        setIsSubmitting(false)
        return
      }

      // 1. Duplicate Check
      const { data: existing } = await supabase
        .from('candidates')
        .select('id, email, phone')
        .or(`email.eq.${values.email},phone.eq.${values.phone}`)
        .limit(1)
        .single()

      if (existing) {
        toast.error(`A candidate with this ${existing.email === values.email ? 'email' : 'phone number'} already exists.`)
        setIsSubmitting(false)
        return
      }

      // 2. Upload Resume
      const fileExt = 'pdf'
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('candidate-resumes')
        .upload(filePath, resumeFile)

      if (uploadError) {
        throw new Error(`Failed to upload resume: ${uploadError.message}`)
      }

      const { data: publicUrlData } = supabase.storage
        .from('candidate-resumes')
        .getPublicUrl(filePath)

      // 3. Insert Candidate Record
      const skillsArray = values.skills.split(',').map(s => s.trim()).filter(Boolean)

      const { error: insertError } = await supabase
        .from('candidates')
        .insert({
          full_name: values.fullName,
          occupation: values.occupation,
          experience_years: values.experienceYears,
          current_company: values.currentCompany || null,
          current_designation: values.currentDesignation || null,
          location: values.location || null,
          preferred_location: values.preferredLocation || null,
          email: values.email,
          phone: values.phone,
          skills: skillsArray,
          resume_url: publicUrlData.publicUrl,
          resume_filename: resumeFile.name,
          remarks: values.remarks || null,
          notice_period: values.noticePeriod || null,
          current_ctc: values.currentCtc || null,
          expected_ctc: values.expectedCtc || null,
          status: values.status,
          offered_ctc: values.status === "Offered" ? (values.offeredCtc || null) : null,
          job_type: values.status === "Offered" ? (values.jobType || null) : null,
        })

      if (insertError) {
        throw new Error(`Failed to save candidate: ${insertError.message}`)
      }

      toast.success("Candidate added successfully!")
      router.push('/candidates')
      router.refresh()
      
    } catch (error: any) {
      toast.error(error.message || "An unexpected error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto pb-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Add Candidate</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-2">
          Create a new candidate profile and upload their resume.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Basic details about the candidate.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number *</FormLabel>
                    <FormControl>
                      <Input placeholder="+1 234 567 8900" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Location</FormLabel>
                    <FormControl>
                      <Input placeholder="New York, NY" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Professional Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="occupation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Primary Occupation *</FormLabel>
                    <FormControl>
                      <Input placeholder="Software Engineer" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="experienceYears"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Experience (Years) *</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currentCompany"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Company</FormLabel>
                    <FormControl>
                      <Input placeholder="Tech Corp Inc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currentDesignation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Designation</FormLabel>
                    <FormControl>
                      <Input placeholder="Senior Developer" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="preferredLocation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Location</FormLabel>
                    <FormControl>
                      <Input placeholder="San Francisco, CA or Remote" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="skills"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Skills (Comma separated) *</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="React, TypeScript, Node.js, Next.js" 
                        className="resize-none"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Interview & Status Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="remarks"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Remarks / Interview Details</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Notes about the interview or candidate" className="resize-none" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="noticePeriod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notice Period</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 30 days" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currentCtc"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current CTC</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 10 LPA" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="expectedCtc"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expected CTC</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 15 LPA" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="New">New</SelectItem>
                        <SelectItem value="Interested">Interested</SelectItem>
                        <SelectItem value="Shortlisted">Shortlisted</SelectItem>
                        <SelectItem value="Interview lineup">Interview lineup</SelectItem>
                        <SelectItem value="Offered">Offered</SelectItem>
                        <SelectItem value="Rejected">Rejected</SelectItem>
                        <SelectItem value="On Hold">On Hold</SelectItem>
                        <SelectItem value="Joined">Joined</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {watchStatus === "Offered" && (
                <>
                  <FormField
                    control={form.control}
                    name="offeredCtc"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Offered CTC</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. 14 LPA" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="jobType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Job Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select job type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Fulltime">Fulltime</SelectItem>
                            <SelectItem value="Contractual">Contractual</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resume Upload</CardTitle>
              <CardDescription>Upload the candidate's CV as a PDF, Word, or Image file (Max 10MB).</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center w-full">
                <label 
                  htmlFor="resume" 
                  className={cn(
                    "flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
                    isDragging 
                      ? "border-blue-500 bg-blue-50/50 dark:border-blue-400 dark:bg-blue-950/20" 
                      : "border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  )}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setIsDragging(true)
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault()
                    setIsDragging(false)
                  }}
                  onDrop={async (e) => {
                    e.preventDefault()
                    setIsDragging(false)
                    if (isExtracting) return
                    const file = e.dataTransfer.files?.[0]
                    if (file) {
                      await handleResumeFile(file)
                    }
                  }}
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                    {isExtracting ? (
                      <Loader2 className="w-8 h-8 mb-3 text-zinc-500 animate-spin" />
                    ) : resumeFile ? (
                      <CheckCircle2 className="w-8 h-8 mb-3 text-emerald-500" />
                    ) : (
                      <UploadCloud className="w-8 h-8 mb-3 text-zinc-500 dark:text-zinc-400" />
                    )}
                    
                    <p className="mb-1 text-sm text-zinc-500 dark:text-zinc-400">
                      <span className="font-semibold">
                        {isExtracting 
                          ? "Extracting details..." 
                          : resumeFile 
                            ? "File selected" 
                            : "Click to select or drag and drop"}
                      </span>
                    </p>
                    
                    <p className="text-xs text-zinc-400 dark:text-zinc-500">
                      {resumeFile ? `${resumeFile.name} (${(resumeFile.size / 1024 / 1024).toFixed(2)} MB)` : "PDF, Word, or Image up to 10MB"}
                    </p>
                  </div>
                  <input 
                    id="resume" 
                    type="file" 
                    className="hidden" 
                    accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,image/png,image/jpeg,image/jpg"
                    disabled={isExtracting}
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        await handleResumeFile(file)
                      }
                    }}
                  />
                </label>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => router.back()}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Candidate"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
