"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

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

export default function EditCandidateForm({ candidate }: { candidate: any }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      fullName: candidate.full_name,
      occupation: candidate.occupation,
      experienceYears: candidate.experience_years,
      currentCompany: candidate.current_company || "",
      currentDesignation: candidate.current_designation || "",
      location: candidate.location || "",
      preferredLocation: candidate.preferred_location || "",
      email: candidate.email,
      phone: candidate.phone,
      skills: (candidate.skills || []).join(", "),
      remarks: candidate.remarks || "",
      noticePeriod: candidate.notice_period || "",
      currentCtc: candidate.current_ctc || "",
      expectedCtc: candidate.expected_ctc || "",
      status: candidate.status || "Pending",
      offeredCtc: candidate.offered_ctc || "",
      jobType: candidate.job_type || "",
    },
  })

  const watchStatus = form.watch("status")

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true)
    try {
      const skillsArray = values.skills.split(',').map(s => s.trim()).filter(Boolean)

      const { error: updateError } = await supabase
        .from('candidates')
        .update({
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
          remarks: values.remarks || null,
          notice_period: values.noticePeriod || null,
          current_ctc: values.currentCtc || null,
          expected_ctc: values.expectedCtc || null,
          status: values.status,
          offered_ctc: values.status === "Offered" ? (values.offeredCtc || null) : null,
          job_type: values.status === "Offered" ? (values.jobType || null) : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', candidate.id)

      if (updateError) {
        throw new Error(`Failed to update candidate: ${updateError.message}`)
      }

      toast.success("Candidate updated successfully!")
      router.push(`/candidates/${candidate.id}`)
      router.refresh()
      
    } catch (error: any) {
      toast.error(error.message || "An unexpected error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name *</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                    <Input type="email" {...field} />
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
                    <Input {...field} />
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
                    <Input {...field} />
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
                    <Input {...field} />
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
                    <Input {...field} />
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
                    <Input {...field} />
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
                    <Input {...field} />
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
                    <Textarea className="resize-none" {...field} />
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
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
