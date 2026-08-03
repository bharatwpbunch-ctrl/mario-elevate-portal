"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"

export function DeleteCandidateButton({ id }: { id: string }) {
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleDelete = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this candidate? This action cannot be undone."
    )
    if (!confirmed) return

    setIsDeleting(true)
    try {
      const { error } = await supabase
        .from("candidates")
        .delete()
        .eq("id", id)

      if (error) throw error

      toast.success("Candidate deleted successfully!")
      router.push("/candidates")
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Failed to delete candidate")
      setIsDeleting(false)
    }
  }

  return (
    <Button 
      variant="destructive" 
      onClick={handleDelete}
      disabled={isDeleting}
    >
      <Trash2 className="mr-2 h-4 w-4" /> 
      {isDeleting ? "Deleting..." : "Delete Candidate"}
    </Button>
  )
}
