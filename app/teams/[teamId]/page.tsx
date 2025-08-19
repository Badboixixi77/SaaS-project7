import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import RealTimeTeamPage from "@/components/real-time-team-page"

interface TeamPageProps {
  params: {
    teamId: string
  }
}

export default async function TeamPage({ params }: TeamPageProps) {
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

  // Get team details and check if user is a member
  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select(`
      *,
      team_members!inner(
        role,
        joined_at,
        user_profiles(full_name, avatar_url)
      )
    `)
    .eq("id", params.teamId)
    .eq("team_members.user_id", user.id)
    .single()

  if (teamError || !team) {
    notFound()
  }

  // Get all team members
  const { data: allMembers } = await supabase
    .from("team_members")
    .select(`
      *,
      user_profiles(full_name, avatar_url)
    `)
    .eq("team_id", params.teamId)

  // Get team projects
  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .eq("team_id", params.teamId)
    .order("created_at", { ascending: false })

  const userRole = team.team_members[0]?.role
  const isOwnerOrAdmin = userRole === "owner" || userRole === "admin"

  return (
    <RealTimeTeamPage
      team={team}
      initialProjects={projects || []}
      initialMembers={allMembers || []}
      userRole={userRole}
      isOwnerOrAdmin={isOwnerOrAdmin}
    />
  )
}
