import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import EditCandidateForm from "./edit-form"

export default async function EditCandidatePage({
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
    <div className="max-w-4xl mx-auto pb-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Edit Candidate</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-2">
          Update the profile information for {candidate.full_name}.
        </p>
      </div>
      <EditCandidateForm candidate={candidate} />
    </div>
  )
}
