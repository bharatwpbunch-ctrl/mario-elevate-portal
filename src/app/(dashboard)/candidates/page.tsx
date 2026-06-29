"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Candidate, columns } from "./columns"
import { DataTable } from "./data-table"
import { toast } from "sonner"
import * as XLSX from "xlsx"
import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function CandidatesPage() {
  const [data, setData] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const supabase = createClient()

  useEffect(() => {
    async function fetchCandidates() {
      setLoading(true)
      const { data: candidates, error } = await supabase
        .from('candidates')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        toast.error("Failed to fetch candidates")
        console.error(error)
      } else {
        setData(candidates || [])
      }
      setLoading(false)
    }

    fetchCandidates()
  }, [])

  // Client-side cross-field filtering
  const filteredData = data.filter((candidate) => {
    if (!searchQuery) return true
    
    const query = searchQuery.toLowerCase()
    return (
      candidate.full_name?.toLowerCase().includes(query) ||
      candidate.occupation?.toLowerCase().includes(query) ||
      candidate.email?.toLowerCase().includes(query) ||
      candidate.phone?.toLowerCase().includes(query) ||
      candidate.skills?.some(skill => skill.toLowerCase().includes(query))
    )
  })

  const exportToExcel = () => {
    const exportData = filteredData.map((c) => ({
      "Name": c.full_name,
      "Email": c.email,
      "Phone": c.phone,
      "Occupation": c.occupation,
      "Experience (Years)": c.experience_years,
      "Location": c.location || "",
      "Skills": Array.isArray(c.skills) ? c.skills.join(", ") : c.skills,
      "Status": c.status || "Pending",
      "Notice Period": c.notice_period || "",
      "Current CTC": c.current_ctc || "",
      "Expected CTC": c.expected_ctc || "",
      "Offered CTC": c.offered_ctc || "",
      "Job Type": c.job_type || "",
      "Remarks": c.remarks || "",
      "Created At": new Date(c.created_at).toLocaleDateString()
    }))

    const worksheet = XLSX.utils.json_to_sheet(exportData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Candidates")
    XLSX.writeFile(workbook, "candidates_export.xlsx")
  }

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Candidates</h2>
        <Button onClick={exportToExcel} disabled={loading || filteredData.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Download Excel
        </Button>
      </div>
      {loading ? (
        <div className="py-10 text-center text-zinc-500">Loading candidates...</div>
      ) : (
        <DataTable 
          columns={columns} 
          data={filteredData} 
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />
      )}
    </div>
  )
}
