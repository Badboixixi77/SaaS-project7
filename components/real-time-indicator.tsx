"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Wifi, WifiOff } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function RealTimeIndicator() {
  const [isConnected, setIsConnected] = useState(true)
  const [activeUsers, setActiveUsers] = useState(0)

  useEffect(() => {
    const supabase = createClient()
    // Monitor connection status
    const channel = supabase.channel("connection-status")

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState()
        setActiveUsers(Object.keys(state).length)
      })
      .on("presence", { event: "join" }, ({ key, newPresences }) => {
        console.log("User joined:", key, newPresences)
      })
      .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
        console.log("User left:", key, leftPresences)
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          setIsConnected(true)
          // Track current user presence
          await channel.track({
            user_id: "current-user",
            online_at: new Date().toISOString(),
          })
        } else {
          setIsConnected(false)
        }
      })

    return () => {
      const supa = createClient()
      supa.removeChannel(channel)
    }
  }, [])

  return (
    <div className="flex items-center space-x-2">
      <Badge variant={isConnected ? "default" : "destructive"} className="flex items-center space-x-1">
        {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
        <span>{isConnected ? "Live" : "Offline"}</span>
      </Badge>
      {activeUsers > 1 && (
        <Badge variant="secondary" className="text-xs">
          {activeUsers} online
        </Badge>
      )}
    </div>
  )
}
