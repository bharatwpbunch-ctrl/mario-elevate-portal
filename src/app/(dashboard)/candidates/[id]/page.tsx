import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, Edit, Download, Mail, Phone, MapPin, Briefcase, Building, FileText, ImageIcon } from "lucide-react"
import { DeleteCandidateButton } from "./delete-button"

export default async function CandidateDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: candidate } = await supabase
    .from("candidates")
    .select("*")
    .eq("id", id)
    .single()

  if (!candidate) {
    notFound()
  }

  return (
    <div className="max-w-6xl mx-auto pb-10 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/candidates" className={buttonVariants({ variant: "ghost", size: "icon" })}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">{candidate.full_name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/candidates/${candidate.id}/edit`} className={buttonVariants({ variant: "outline" })}>
            <Edit className="mr-2 h-4 w-4" /> Edit Profile
          </Link>
          <a href={candidate.resume_url} target="_blank" rel="noopener noreferrer" className={buttonVariants({})}>
            <Download className="mr-2 h-4 w-4" /> Download Resume
          </a>
          <DeleteCandidateButton id={candidate.id} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 text-zinc-600 dark:text-zinc-400">
                <Mail className="h-4 w-4" />
                <a href={`mailto:${candidate.email}`} className="hover:underline">
                  {candidate.email}
                </a>
              </div>
              <div className="flex items-center gap-3 text-zinc-600 dark:text-zinc-400">
                <Phone className="h-4 w-4" />
                <a href={`tel:${candidate.phone}`} className="hover:underline">
                  {candidate.phone}
                </a>
              </div>
              {candidate.location && (
                <div className="flex items-center gap-3 text-zinc-600 dark:text-zinc-400">
                  <MapPin className="h-4 w-4" />
                  <span>{candidate.location}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Professional Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <Briefcase className="h-4 w-4 mt-1 text-zinc-500" />
                <div>
                  <div className="font-medium">Occupation</div>
                  <div className="text-zinc-600 dark:text-zinc-400">{candidate.occupation}</div>
                </div>
              </div>
              <div className="flex gap-3">
                <Briefcase className="h-4 w-4 mt-1 text-zinc-500" />
                <div>
                  <div className="font-medium">Experience</div>
                  <div className="text-zinc-600 dark:text-zinc-400">{candidate.experience_years} Years</div>
                </div>
              </div>
              {candidate.current_company && (
                <div className="flex gap-3">
                  <Building className="h-4 w-4 mt-1 text-zinc-500" />
                  <div>
                    <div className="font-medium">Current Company</div>
                    <div className="text-zinc-600 dark:text-zinc-400">{candidate.current_company}</div>
                  </div>
                </div>
              )}
              {candidate.current_designation && (
                <div className="flex gap-3">
                  <Briefcase className="h-4 w-4 mt-1 text-zinc-500" />
                  <div>
                    <div className="font-medium">Current Designation</div>
                    <div className="text-zinc-600 dark:text-zinc-400">{candidate.current_designation}</div>
                  </div>
                </div>
              )}
              {candidate.preferred_location && (
                <div className="flex gap-3">
                  <MapPin className="h-4 w-4 mt-1 text-zinc-500" />
                  <div>
                    <div className="font-medium">Preferred Location</div>
                    <div className="text-zinc-600 dark:text-zinc-400">{candidate.preferred_location}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Interview & Status Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="font-medium">Status</div>
                <Badge variant={candidate.status === 'Offered' || candidate.status === 'Joined' || candidate.status === 'Shortlisted' ? 'default' : candidate.status === 'Rejected' ? 'destructive' : 'secondary'}>
                  {candidate.status || "New"}
                </Badge>
              </div>
              {candidate.notice_period && (
                <div>
                  <div className="font-medium text-sm text-zinc-500">Notice Period</div>
                  <div>{candidate.notice_period}</div>
                </div>
              )}
              {candidate.current_ctc && (
                <div>
                  <div className="font-medium text-sm text-zinc-500">Current CTC</div>
                  <div>{candidate.current_ctc}</div>
                </div>
              )}
              {candidate.expected_ctc && (
                <div>
                  <div className="font-medium text-sm text-zinc-500">Expected CTC</div>
                  <div>{candidate.expected_ctc}</div>
                </div>
              )}
              {candidate.status === "Offered" && candidate.offered_ctc && (
                <div>
                  <div className="font-medium text-sm text-zinc-500">Offered CTC</div>
                  <div>{candidate.offered_ctc}</div>
                </div>
              )}
              {candidate.status === "Offered" && candidate.job_type && (
                <div>
                  <div className="font-medium text-sm text-zinc-500">Job Type</div>
                  <div>{candidate.job_type}</div>
                </div>
              )}
              {candidate.remarks && (
                <div>
                  <div className="font-medium text-sm text-zinc-500">Remarks</div>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{candidate.remarks}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Skills</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {candidate.skills?.map((skill: string) => (
                  <Badge key={skill} variant="secondary">
                    {skill}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card className="h-[800px] flex flex-col">
            <CardHeader>
              <CardTitle>Resume Preview</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0 rounded-b-xl overflow-hidden bg-zinc-50 dark:bg-zinc-950">
              {(() => {
                const url = candidate.resume_url || ""
                const filename = candidate.resume_filename || ""
                const cleanUrl = url.split('?')[0].split('#')[0].toLowerCase()
                const cleanFilename = filename.toLowerCase()

                // Extract extension from original filename first if available, otherwise from URL
                const getExt = (fname: string, u: string) => {
                  if (fname && fname.includes('.')) {
                    return fname.split('.').pop() || ""
                  }
                  return u.split('?')[0].split('#')[0].split('.').pop() || ""
                }

                const ext = getExt(cleanFilename, cleanUrl)

                const isPdf = ext === "pdf"
                const isWord = ext === "docx" || ext === "doc"
                const isImage = ext === "png" || ext === "jpg" || ext === "jpeg"

                if (isPdf) {
                  return (
                    <iframe
                      src={`${candidate.resume_url}#view=FitH`}
                      className="w-full h-full border-0"
                      title="Resume PDF Viewer"
                    />
                  )
                }

                if (isImage) {
                  return (
                    <div className="w-full h-full flex items-center justify-center p-4 overflow-auto">
                      <img
                        src={candidate.resume_url}
                        alt="Resume Preview"
                        className="max-w-full max-h-full object-contain rounded shadow-md border bg-white dark:bg-zinc-900"
                      />
                    </div>
                  )
                }

                if (isWord) {
                  return (
                    <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                      <FileText className="h-16 w-16 text-zinc-400 mb-4" />
                      <h3 className="font-semibold text-lg text-zinc-900 dark:text-zinc-50">Word Document Preview</h3>
                      <p className="text-zinc-500 dark:text-zinc-400 max-w-sm mt-2 mb-6 text-sm">
                        Word documents (.docx, .doc) cannot be previewed natively in the browser. You can view it using Microsoft Office Online Viewer, or download the file directly.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <a 
                          href={`https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(candidate.resume_url)}`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className={buttonVariants({ variant: "outline" })}
                        >
                          View Online (Office Viewer)
                        </a>
                        <a 
                          href={candidate.resume_url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className={buttonVariants({})}
                        >
                          <Download className="mr-2 h-4 w-4" /> Download Resume
                        </a>
                      </div>
                    </div>
                  )
                }

                return (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                    <FileText className="h-16 w-16 text-zinc-400 mb-4" />
                    <h3 className="font-semibold text-lg text-zinc-900 dark:text-zinc-50">Preview Not Available</h3>
                    <p className="text-zinc-500 dark:text-zinc-400 max-w-sm mt-2 mb-6 text-sm">
                      This file format does not support inline browser preview. Please download the file to view it.
                    </p>
                    <a 
                      href={candidate.resume_url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className={buttonVariants({})}
                    >
                      <Download className="mr-2 h-4 w-4" /> Download Resume
                    </a>
                  </div>
                )
              })()}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
