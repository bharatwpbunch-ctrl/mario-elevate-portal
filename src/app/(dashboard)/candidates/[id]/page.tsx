import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, Edit, Download, Mail, Phone, MapPin, Briefcase, Building } from "lucide-react"

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
                <Badge variant={candidate.status === 'Offered' || candidate.status === 'Selected' ? 'default' : candidate.status === 'Rejected' ? 'destructive' : 'secondary'}>
                  {candidate.status || "Pending"}
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
            <CardContent className="flex-1 p-0 rounded-b-xl overflow-hidden">
              <iframe
                src={`${candidate.resume_url}#view=FitH`}
                className="w-full h-full border-0"
                title="Resume PDF Viewer"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
