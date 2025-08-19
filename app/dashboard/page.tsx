import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import RealTimeDashboard from "@/components/real-time-dashboard"

export default async function DashboardPage() {
  // If Supabase is not configured, show setup message
  if (!isSupabaseConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <h1 className="text-2xl font-bold mb-4">Connect Supabase to get started</h1>
      </div>
    )
  }

  // Get the user from the server
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If no user, redirect to login
  if (!user) {
    redirect("/auth/login")
  }

  // Get user's teams
  const { data: teams, error } = await supabase
    .from("teams")
    .select(`
      *,
      team_members!inner(role),
      projects(count)
    `)
    .eq("team_members.user_id", user.id)

  if (error) {
    console.error("Error fetching teams:", error)
  }

  // Get user profile
  const { data: profile } = await supabase.from("user_profiles").select("*").eq("id", user.id).single()

  return <RealTimeDashboard initialTeams={teams || []} user={user} profile={profile} />
}
