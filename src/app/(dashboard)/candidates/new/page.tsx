"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { extractTextFromPDF } from "@/lib/parse-pdf"
import { parseResumeWithAI } from "@/app/actions/parse-resume"
import { parseResumeText } from "@/lib/extract-info"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
  status: z.enum(["Pending", "Offered", "Selected", "Rejected"]).default("Pending"),
  offeredCtc: z.string().optional(),
  jobType: z.string().optional(),
})

export default function AddCandidatePage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [isExtracting, setIsExtracting] = useState(false)
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
      status: "Pending",
      offeredCtc: "",
      jobType: "",
    },
  })

  const watchStatus = form.watch("status")

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!resumeFile) {
      toast.error("Please upload a resume (PDF)")
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
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Selected">Selected</SelectItem>
                        <SelectItem value="Offered">Offered</SelectItem>
                        <SelectItem value="Rejected">Rejected</SelectItem>
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
              <CardDescription>Upload the candidate's CV as a PDF file (Max 10MB).</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Input 
                  id="resume" 
                  type="file" 
                  accept="application/pdf"
                  disabled={isExtracting}
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      if (file.type !== "application/pdf") {
                        toast.error("Please select a valid PDF file")
                        e.target.value = ''
                        setResumeFile(null)
                        return
                      }
                      if (file.size > MAX_FILE_SIZE) {
                        toast.error("File size exceeds 10MB limit")
                        e.target.value = ''
                        setResumeFile(null)
                        return
                      }
                      setResumeFile(file)
                      
                      try {
                        setIsExtracting(true)
                        const text = await extractTextFromPDF(file)
                        const result = await parseResumeWithAI(text)
                        
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
                        console.error("Failed to parse PDF", err)
                        toast.error("Could not parse resume automatically. Please enter details manually.")
                      } finally {
                        setIsExtracting(false)
                      }
                    } else {
                      setResumeFile(null)
                    }
                  }}
                />
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
