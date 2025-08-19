"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Plus, Users, Settings, FolderOpen } from "lucide-react"
import Link from "next/link"
import CreateProjectDialog from "@/components/create-project-dialog"
import { createClient } from "@/lib/supabase/client"

interface Project {
  id: string
  name: string
  description?: string
  status: string
  created_at: string
}

interface TeamMember {
  id: string
  role: string
  user_profiles?: {
    full_name?: string
    avatar_url?: string
  }
}

interface Team {
  id: string
  name: string
  description?: string
  created_at: string
}

interface RealTimeTeamPageProps {
  team: Team
  initialProjects: Project[]
  initialMembers: TeamMember[]
  userRole: string
  isOwnerOrAdmin: boolean
}

export default function RealTimeTeamPage({
  team,
  initialProjects,
  initialMembers,
  userRole,
  isOwnerOrAdmin,
}: RealTimeTeamPageProps) {
  const [projects, setProjects] = useState<Project[]>(initialProjects)
  const [members, setMembers] = useState<TeamMember[]>(initialMembers)

  useEffect(() => {
    const supabase = createClient()
    // Subscribe to project changes for this team
    const projectsChannel = supabase
      .channel(`team-${team.id}-projects`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "projects",
          filter: `team_id=eq.${team.id}`,
        },
        (payload) => {
          console.log("Real-time project update:", payload)
          handleProjectUpdate(payload)
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "team_members",
          filter: `team_id=eq.${team.id}`,
        },
        (payload) => {
          console.log("Real-time team member update:", payload)
          handleMemberUpdate(payload)
        },
      )
      .subscribe()

    return () => {
      const supa = createClient()
      supa.removeChannel(projectsChannel)
    }
  }, [team.id])

  const handleProjectUpdate = (payload: any) => {
    const { eventType, new: newRecord, old: oldRecord } = payload

    setProjects((currentProjects) => {
      if (eventType === "INSERT") {
        return [...currentProjects, newRecord].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        )
      } else if (eventType === "UPDATE") {
        return currentProjects.map((project) => (project.id === newRecord.id ? newRecord : project))
      } else if (eventType === "DELETE") {
        return currentProjects.filter((project) => project.id !== oldRecord.id)
      }
      return currentProjects
    })
  }

  const handleMemberUpdate = (payload: any) => {
    const { eventType, new: newRecord, old: oldRecord } = payload

    if (eventType === "INSERT") {
      // New member added - refresh to get full member data
      window.location.reload()
    } else if (eventType === "DELETE") {
      setMembers((currentMembers) => currentMembers.filter((member) => member.id !== oldRecord.id))
    } else if (eventType === "UPDATE") {
      setMembers((currentMembers) =>
        currentMembers.map((member) => (member.id === newRecord.id ? { ...member, role: newRecord.role } : member)),
      )
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{team.name}</h1>
                {team.description && <p className="text-gray-600">{team.description}</p>}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {isOwnerOrAdmin && (
                <Link href={`/teams/${team.id}/settings`}>
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Projects Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Projects</CardTitle>
                  {isOwnerOrAdmin && <CreateProjectDialog teamId={team.id} />}
                </div>
              </CardHeader>
              <CardContent>
                {projects && projects.length > 0 ? (
                  <div className="space-y-4">
                    {projects.map((project) => (
                      <div
                        key={project.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-center space-x-3">
                          <FolderOpen className="h-5 w-5 text-blue-600" />
                          <div>
                            <h3 className="font-medium">{project.name}</h3>
                            {project.description && <p className="text-sm text-gray-600">{project.description}</p>}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={project.status === "active" ? "default" : "secondary"}>
                            {project.status}
                          </Badge>
                          <Link href={`/projects/${project.id}`}>
                            <Button size="sm" variant="outline">
                              View Board
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
                    <p className="text-gray-600 mb-4">Create your first project to start organizing tasks.</p>
                    {isOwnerOrAdmin && <CreateProjectDialog teamId={team.id} />}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Team Members */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Team Members ({members?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {members && members.length > 0 ? (
                  <div className="space-y-3">
                    {members.map((member) => (
                      <div key={member.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-600">
                              {member.user_profiles?.full_name?.[0] || "?"}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium">{member.user_profiles?.full_name || "Unknown User"}</p>
                          </div>
                        </div>
                        <Badge variant={member.role === "owner" ? "default" : "secondary"}>{member.role}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 text-sm">No members found</p>
                )}

                {isOwnerOrAdmin && (
                  <Button variant="outline" size="sm" className="w-full mt-4 bg-transparent">
                    <Plus className="h-4 w-4 mr-2" />
                    Invite Member
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Team Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Team Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Projects</span>
                  <span className="font-medium">{projects?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Members</span>
                  <span className="font-medium">{members?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Created</span>
                  <span className="font-medium">{new Date(team.created_at).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
