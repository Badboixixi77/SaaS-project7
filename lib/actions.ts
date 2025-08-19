"use server"

import { createServerActionClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

// Sign in action
export async function signIn(prevState: any, formData: FormData) {
  if (!formData) {
    return { error: "Form data is missing" }
  }

  const email = formData.get("email")
  const password = formData.get("password")

  if (!email || !password) {
    return { error: "Email and password are required" }
  }

  const cookieStore = cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.toString(),
      password: password.toString(),
    })

    if (error) {
      return { error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("Login error:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }
}

// Sign up action
export async function signUp(prevState: any, formData: FormData) {
  if (!formData) {
    return { error: "Form data is missing" }
  }

  const email = formData.get("email")
  const password = formData.get("password")
  const fullName = formData.get("fullName")

  if (!email || !password || !fullName) {
    return { error: "Email, password, and full name are required" }
  }

  const cookieStore = cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.toString(),
      password: password.toString(),
      options: {
        emailRedirectTo:
          process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ||
          `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/dashboard`,
        data: {
          full_name: fullName.toString(),
        },
      },
    })

    if (error) {
      return { error: error.message }
    }

    // Create user profile
    if (data.user) {
      await supabase.from("user_profiles").insert({
        id: data.user.id,
        full_name: fullName.toString(),
      })
    }

    return { success: "Check your email to confirm your account." }
  } catch (error) {
    console.error("Sign up error:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }
}

// Sign out action
export async function signOut() {
  const cookieStore = cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

  await supabase.auth.signOut()
  redirect("/auth/login")
}

// Create team action
export async function createTeam(prevState: any, formData: FormData) {
  if (!formData) {
    return { error: "Form data is missing" }
  }

  const name = formData.get("name")
  const description = formData.get("description")

  if (!name) {
    return { error: "Team name is required" }
  }

  const cookieStore = cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: "You must be logged in to create a team" }
    }

    // Create team
    const { data: team, error: teamError } = await supabase
      .from("teams")
      .insert({
        name: name.toString(),
        description: description?.toString() || null,
      })
      .select()
      .single()

    if (teamError) {
      return { error: teamError.message }
    }

    // Add user as team owner
    const { error: memberError } = await supabase.from("team_members").insert({
      team_id: team.id,
      user_id: user.id,
      role: "owner",
    })

    if (memberError) {
      return { error: memberError.message }
    }

    return { success: "Team created successfully!", teamId: team.id }
  } catch (error) {
    console.error("Create team error:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }
}

// Create project action
export async function createProject(prevState: any, formData: FormData) {
  if (!formData) {
    return { error: "Form data is missing" }
  }

  const teamId = formData.get("teamId")
  const name = formData.get("name")
  const description = formData.get("description")

  if (!teamId || !name) {
    return { error: "Team ID and project name are required" }
  }

  const cookieStore = cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: "You must be logged in to create a project" }
    }

    // Verify user is a member of the team
    const { data: membership } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .single()

    if (!membership) {
      return { error: "You are not a member of this team" }
    }

    // Create project
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .insert({
        team_id: teamId,
        name: name.toString(),
        description: description?.toString() || null,
        created_by: user.id,
      })
      .select()
      .single()

    if (projectError) {
      return { error: projectError.message }
    }

    // Create default task lists
    const defaultLists = [
      { name: "To Do", position: 0 },
      { name: "In Progress", position: 1 },
      { name: "Review", position: 2 },
      { name: "Done", position: 3 },
    ]

    const { error: listsError } = await supabase.from("task_lists").insert(
      defaultLists.map((list) => ({
        project_id: project.id,
        name: list.name,
        position: list.position,
      })),
    )

    if (listsError) {
      console.error("Error creating default task lists:", listsError)
      // Don't fail the project creation if task lists fail
    }

    return { success: "Project created successfully!", projectId: project.id }
  } catch (error) {
    console.error("Create project error:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }
}
