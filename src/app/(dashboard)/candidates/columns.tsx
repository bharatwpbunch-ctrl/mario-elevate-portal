"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { MoreHorizontal, Eye, Edit } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"
import { toast } from "sonner"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type Candidate = {
  id: string
  full_name: string
  occupation: string
  experience_years: number
  location: string | null
  email: string
  phone: string
  skills: string[]
  status: string
  created_at: string
  remarks?: string
  notice_period?: string
  current_ctc?: string
  expected_ctc?: string
  offered_ctc?: string
  job_type?: string
}

const ActionCell = ({ candidate }: { candidate: Candidate }) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-8 w-8 p-0")}>
        <span className="sr-only">Open menu</span>
        <MoreHorizontal className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem render={<Link href={`/candidates/${candidate.id}`} />}>
          <Eye className="mr-2 h-4 w-4" /> View Details
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href={`/candidates/${candidate.id}/edit`} />}>
          <Edit className="mr-2 h-4 w-4" /> Edit Profile
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            navigator.clipboard.writeText(candidate.email)
            toast.success("Email copied to clipboard!")
          }}
        >
          Copy Email
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const StatusCell = ({ candidate }: { candidate: Candidate }) => {
  const [status, setStatus] = useState(candidate.status || "New")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleStatusChange = async (newStatus: string | null) => {
    if (!newStatus) return
    setIsLoading(true)
    setStatus(newStatus)
    try {
      const { error } = await supabase
        .from("candidates")
        .update({ status: newStatus })
        .eq("id", candidate.id)

      if (error) throw error
      toast.success("Status updated successfully!")
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Failed to update status")
      setStatus(candidate.status || "New")
    } finally {
      setIsLoading(false)
    }
  }

  const statusStyles: Record<string, string> = {
    "New": "bg-zinc-100 text-zinc-800 border-zinc-200 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700 dark:hover:bg-zinc-700",
    "Interested": "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800 dark:hover:bg-indigo-900/40",
    "Shortlisted": "bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800 dark:hover:bg-cyan-900/40",
    "Interview lineup": "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 dark:hover:bg-amber-900/40",
    "Offered": "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 dark:hover:bg-emerald-900/40",
    "Rejected": "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 dark:hover:bg-rose-900/40",
    "On Hold": "bg-zinc-100 text-zinc-600 border-zinc-200 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700 dark:hover:bg-zinc-700",
    "Joined": "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 dark:hover:bg-blue-900/40",
  }

  return (
    <Select value={status} onValueChange={handleStatusChange} disabled={isLoading}>
      <SelectTrigger className={cn("h-7 px-2.5 text-xs font-semibold rounded-full border shadow-xs transition-colors cursor-pointer flex items-center justify-between gap-1.5", statusStyles[status] || statusStyles["New"])}>
        <SelectValue placeholder="Status" />
      </SelectTrigger>
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
  )
}

export const columns: ColumnDef<Candidate>[] = [
  {
    accessorKey: "full_name",
    header: "Name",
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("full_name")}</div>
    ),
  },
  {
    accessorKey: "occupation",
    header: "Occupation",
  },
  {
    accessorKey: "experience_years",
    header: "Exp (Yrs)",
  },
  {
    accessorKey: "location",
    header: "Location",
    cell: ({ row }) => row.getValue("location") || "-",
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "phone",
    header: "Phone",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusCell candidate={row.original} />
  },
  {
    id: "actions",
    cell: ({ row }) => <ActionCell candidate={row.original} />,
  },
]
