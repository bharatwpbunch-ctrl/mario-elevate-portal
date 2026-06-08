import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, FileText, UserPlus, ArrowRight } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { buttonVariants } from "@/components/ui/button"

export default async function OverviewPage() {
  const supabase = await createClient()

  // 1. Fetch Total Candidates Count
  const { count: totalCandidates } = await supabase
    .from('candidates')
    .select('*', { count: 'exact', head: true })

  // 2. Fetch Candidates Added This Month
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)
  
  const { count: addedThisMonth } = await supabase
    .from('candidates')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', startOfMonth.toISOString())

  // 3. Fetch Candidates with Resumes Count
  const { count: totalResumes } = await supabase
    .from('candidates')
    .select('*', { count: 'exact', head: true })
    .not('resume_url', 'is', null)

  // 4. Fetch Recent Candidates (Top 5)
  const { data: recentCandidates } = await supabase
    .from('candidates')
    .select('id, full_name, occupation, location, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  const candidatesList = recentCandidates || []

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-2">
            Here's a summary of your talent database.
          </p>
        </div>
        <Link href="/candidates/new" className={buttonVariants({})}>
          Add Candidate
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Candidates</CardTitle>
            <Users className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCandidates || 0}</div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Active candidates in database
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Added This Month</CardTitle>
            <UserPlus className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{addedThisMonth || 0}</div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              New profiles since {startOfMonth.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Resumes</CardTitle>
            <FileText className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalResumes || 0}</div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Parsed resumes in storage
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 grid-cols-1">
        <Card className="col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Candidates</CardTitle>
            {candidatesList.length > 0 && (
              <Link href="/candidates" className="text-xs text-zinc-500 hover:text-zinc-900 flex items-center gap-1">
                View All <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </CardHeader>
          <CardContent>
            {candidatesList.length > 0 ? (
              <div className="divide-y animate-in fade-in duration-500">
                {candidatesList.map((candidate) => (
                  <div key={candidate.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                    <div>
                      <Link href={`/candidates/${candidate.id}`} className="font-semibold text-sm hover:underline text-zinc-950 dark:text-zinc-50">
                        {candidate.full_name}
                      </Link>
                      <div className="text-xs text-zinc-500 mt-0.5">
                        {candidate.occupation} {candidate.location ? `• ${candidate.location}` : ""}
                      </div>
                    </div>
                    <div className="text-xs text-zinc-400">
                      {formatDistanceToNow(new Date(candidate.created_at), { addSuffix: true })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-zinc-500 text-sm">
                No candidates added yet. Start building your database!
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
