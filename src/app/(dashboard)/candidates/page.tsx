"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Candidate, columns } from "./columns"
import { DataTable } from "./data-table"
import { toast } from "sonner"

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

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Candidates</h2>
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
