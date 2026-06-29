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
    cell: ({ row }) => {
      const status = row.getValue("status") as string || "Pending"
      let variant: "default" | "secondary" | "destructive" | "outline" = "secondary"
      
      if (status === "Offered") variant = "default"
      if (status === "Selected") variant = "default"
      if (status === "Rejected") variant = "destructive"
      
      return <Badge variant={variant}>{status}</Badge>
    }
  },
  {
    id: "actions",
    cell: ({ row }) => <ActionCell candidate={row.original} />,
  },
]
