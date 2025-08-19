import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Settings } from "lucide-react"
import Link from "next/link"
import KanbanBoard from "@/components/kanban-board"
import RealTimeIndicator from "@/components/real-time-indicator"

interface ProjectPageProps {
  params: {
    projectId: string
  }
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  // If Supabase is not configured, show setup message
  if (!isSupabaseConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <h1 className="text-2xl font-bold mb-4">Connect Supabase to get started</h1>
      </div>
    )
  }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Get project details and check if user has access
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select(`
      *,
      teams!inner(
        *,
        team_members!inner(user_id, role)
      )
    `)
    .eq("id", params.projectId)
    .eq("teams.team_members.user_id", user.id)
    .single()

  if (projectError || !project) {
    notFound()
  }

  // Get task lists (columns) for this project
  const { data: taskLists, error: taskListsError } = await supabase
    .from("task_lists")
    .select(`
      *,
      tasks(
        *,
        user_profiles:assigned_to(full_name, avatar_url),
        creator:created_by(full_name)
      )
    `)
    .eq("project_id", params.projectId)
    .order("position", { ascending: true })

  if (taskListsError) {
    console.error("Error fetching task lists:", taskListsError)
  }

  // Sort tasks within each list by position
  const sortedTaskLists =
    taskLists?.map((list) => ({
      ...list,
      tasks: list.tasks?.sort((a, b) => a.position - b.position) || [],
    })) || []

  const userRole = project.teams.team_members[0]?.role
  const canEdit = userRole === "owner" || userRole === "admin"

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href={`/teams/${project.team_id}`}>
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Team
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
                {project.description && <p className="text-gray-600">{project.description}</p>}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <RealTimeIndicator />
              {canEdit && (
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Project Settings
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Kanban Board */}
          <div className="lg:col-span-3">
            <KanbanBoard projectId={params.projectId} taskLists={sortedTaskLists} canEdit={canEdit} />
          </div>

          {/* Sidebar with time tracker and other tools */}
          <div className="lg:col-span-1 space-y-6">
            {/* Time Tracker would go here when a task is selected */}
            <div className="text-sm text-gray-500 text-center py-4">Click on a task to start tracking time</div>
          </div>
        </div>
      </div>
    </div>
  )
}
