"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, Settings, LogOut } from "lucide-react"
import Link from "next/link"
import { signOut } from "@/lib/actions"
import CreateTeamDialog from "@/components/create-team-dialog"
import { createClient } from "@/lib/supabase/client"

interface Team {
  id: string
  name: string
  description?: string
  created_at: string
  team_members: Array<{ role: string }>
  projects: Array<{ count: number }>
}

interface User {
  id: string
  email: string
}

interface UserProfile {
  full_name?: string
}

interface RealTimeDashboardProps {
  initialTeams: Team[]
  user: User
  profile: UserProfile | null
}

export default function RealTimeDashboard({ initialTeams, user, profile }: RealTimeDashboardProps) {
  const [teams, setTeams] = useState<Team[]>(initialTeams)

  useEffect(() => {
    const supabase = createClient()
    // Subscribe to team changes for current user
    const teamsChannel = supabase
      .channel(`user-${user.id}-teams`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "teams",
        },
        (payload) => {
          console.log("Real-time team update:", payload)
          handleTeamUpdate(payload)
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "team_members",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("Real-time team membership update:", payload)
          handleTeamMembershipUpdate(payload)
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "projects",
        },
        (payload) => {
          console.log("Real-time project update:", payload)
          handleProjectUpdate(payload)
        },
      )
      .subscribe()

    return () => {
      const supa = createClient()
      supa.removeChannel(teamsChannel)
    }
  }, [user.id])

  const handleTeamUpdate = (payload: any) => {
    const { eventType, new: newRecord, old: oldRecord } = payload

    setTeams((currentTeams) => {
      if (eventType === "INSERT") {
        // Check if user is a member of this new team
        return currentTeams // Will be handled by team_members subscription
      } else if (eventType === "UPDATE") {
        return currentTeams.map((team) =>
          team.id === newRecord.id
            ? {
                ...team,
                name: newRecord.name,
                description: newRecord.description,
              }
            : team,
        )
      } else if (eventType === "DELETE") {
        return currentTeams.filter((team) => team.id !== oldRecord.id)
      }
      return currentTeams
    })
  }

  const handleTeamMembershipUpdate = (payload: any) => {
    const { eventType, new: newRecord, old: oldRecord } = payload

    if (eventType === "INSERT") {
      // User was added to a team - refresh to get full team data
      window.location.reload()
    } else if (eventType === "DELETE") {
      // User was removed from a team
      setTeams((currentTeams) => currentTeams.filter((team) => team.id !== oldRecord.team_id))
    }
  }

  const handleProjectUpdate = (payload: any) => {
    const { eventType, new: newRecord, old: oldRecord } = payload

    setTeams((currentTeams) => {
      return currentTeams.map((team) => {
        if (eventType === "INSERT" && team.id === newRecord.team_id) {
          return {
            ...team,
            projects: [{ count: (team.projects[0]?.count || 0) + 1 }],
          }
        } else if (eventType === "DELETE" && team.id === oldRecord.team_id) {
          return {
            ...team,
            projects: [{ count: Math.max((team.projects[0]?.count || 1) - 1, 0) }],
          }
        }
        return team
      })
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">Welcome, {profile?.full_name || user.email}</span>
            <form action={signOut}>
              <Button type="submit" variant="ghost" size="sm">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </form>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Teams Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Your Teams</h2>
            <CreateTeamDialog />
          </div>

          {teams && teams.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teams.map((team) => (
                <Card key={team.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{team.name}</span>
                      <div className="flex items-center space-x-1">
                        <Users className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-500">{team.team_members?.length || 0}</span>
                      </div>
                    </CardTitle>
                    {team.description && <CardDescription>{team.description}</CardDescription>}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">{team.projects?.[0]?.count || 0} projects</div>
                      <div className="flex items-center space-x-2">
                        <Link href={`/teams/${team.id}`}>
                          <Button size="sm">View Team</Button>
                        </Link>
                        {team.team_members?.[0]?.role === "owner" && (
                          <Link href={`/teams/${team.id}/settings`}>
                            <Button size="sm" variant="outline">
                              <Settings className="h-4 w-4" />
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="text-center py-12">
              <CardContent>
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No teams yet</h3>
                <p className="text-gray-600 mb-6">Create your first team to start collaborating with others.</p>
                <CreateTeamDialog />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 text-sm">No recent activity</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tasks Assigned to You</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 text-sm">No tasks assigned</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Upcoming Deadlines</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 text-sm">No upcoming deadlines</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
