"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { Play, Square, Clock } from "lucide-react"

interface TimeTrackerProps {
  taskId: string
  taskTitle: string
}

interface TimeEntry {
  id: string
  started_at: string
  ended_at: string | null
  duration_minutes: number | null
}

export function TimeTracker({ taskId, taskTitle }: TimeTrackerProps) {
  const [isTracking, setIsTracking] = useState(false)
  const [currentEntry, setCurrentEntry] = useState<TimeEntry | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [totalTime, setTotalTime] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    fetchTimeEntries()
    checkActiveEntry()
  }, [taskId])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isTracking && currentEntry) {
      interval = setInterval(() => {
        const startTime = new Date(currentEntry.started_at).getTime()
        const now = Date.now()
        setElapsedTime(Math.floor((now - startTime) / 1000))
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isTracking, currentEntry])

  const fetchTimeEntries = async () => {
    const { data } = await supabase
      .from("time_entries")
      .select("duration_minutes")
      .eq("task_id", taskId)
      .not("duration_minutes", "is", null)

    if (data) {
      const total = data.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0)
      setTotalTime(total)
    }
  }

  const checkActiveEntry = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from("time_entries")
      .select("*")
      .eq("task_id", taskId)
      .eq("user_id", user.id)
      .is("ended_at", null)
      .single()

    if (data) {
      setCurrentEntry(data)
      setIsTracking(true)
      const startTime = new Date(data.started_at).getTime()
      const now = Date.now()
      setElapsedTime(Math.floor((now - startTime) / 1000))
    }
  }

  const startTracking = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from("time_entries")
      .insert({
        task_id: taskId,
        user_id: user.id,
        started_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (data && !error) {
      setCurrentEntry(data)
      setIsTracking(true)
      setElapsedTime(0)
    }
  }

  const stopTracking = async () => {
    if (!currentEntry) return

    const endTime = new Date().toISOString()
    const { error } = await supabase.from("time_entries").update({ ended_at: endTime }).eq("id", currentEntry.id)

    if (!error) {
      setIsTracking(false)
      setCurrentEntry(null)
      setElapsedTime(0)
      fetchTimeEntries()
    }
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Time Tracker
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-gray-600 truncate">{taskTitle}</div>

        {/* Current Session */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-mono font-bold">{formatTime(elapsedTime)}</div>
            <div className="text-sm text-gray-500">Current session</div>
          </div>
          <div className="flex gap-2">
            {!isTracking ? (
              <Button onClick={startTracking} size="sm" className="bg-green-600 hover:bg-green-700">
                <Play className="w-4 h-4 mr-1" />
                Start
              </Button>
            ) : (
              <Button onClick={stopTracking} size="sm" variant="destructive">
                <Square className="w-4 h-4 mr-1" />
                Stop
              </Button>
            )}
          </div>
        </div>

        {/* Total Time */}
        <div className="pt-3 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Total time logged:</span>
            <Badge variant="secondary">{formatDuration(totalTime)}</Badge>
          </div>
        </div>

        {isTracking && (
          <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            Tracking time...
          </div>
        )}
      </CardContent>
    </Card>
  )
}
