import { createClient } from "@/lib/supabase/client"

export type Permission = "create" | "read" | "update" | "delete" | "manage_members" | "manage_billing" | "upload"

export type Resource = "team" | "project" | "task" | "comment" | "attachment" | "analytics"

export type Role = "owner" | "admin" | "member" | "viewer"

export const ROLE_HIERARCHY: Record<Role, number> = {
  viewer: 1,
  member: 2,
  admin: 3,
  owner: 4,
}

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  owner: "Full access to everything including billing and team deletion",
  admin: "Can manage projects, tasks, and team members (except billing)",
  member: "Can create and edit tasks, add comments and attachments",
  viewer: "Read-only access to projects and tasks",
}

export const ROLE_PERMISSIONS: Record<Role, Record<Resource, Permission[]>> = {
  owner: {
    team: ["create", "read", "update", "delete", "manage_members", "manage_billing"],
    project: ["create", "read", "update", "delete"],
    task: ["create", "read", "update", "delete"],
    comment: ["create", "read", "update", "delete"],
    attachment: ["upload", "read", "delete"],
    analytics: ["read"],
  },
  admin: {
    team: ["read", "update", "manage_members"],
    project: ["create", "read", "update", "delete"],
    task: ["create", "read", "update", "delete"],
    comment: ["create", "read", "update", "delete"],
    attachment: ["upload", "read", "delete"],
    analytics: ["read"],
  },
  member: {
    team: ["read"],
    project: ["read"],
    task: ["create", "read", "update"],
    comment: ["create", "read", "update"],
    attachment: ["upload", "read"],
    analytics: ["read"],
  },
  viewer: {
    team: ["read"],
    project: ["read"],
    task: ["read"],
    comment: ["read"],
    attachment: ["read"],
    analytics: [],
  },
}

export async function getUserRole(teamId: string): Promise<Role | null> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .single()

  return (data?.role as Role) || null
}

export async function hasPermission(teamId: string, permission: Permission, resource: Resource): Promise<boolean> {
  const role = await getUserRole(teamId)
  if (!role) return false

  const permissions = ROLE_PERMISSIONS[role][resource] || []
  return permissions.includes(permission)
}

export function canManageRole(currentRole: Role, targetRole: Role): boolean {
  // Owners can manage anyone except other owners
  if (currentRole === "owner") {
    return targetRole !== "owner"
  }

  // Admins can manage members and viewers
  if (currentRole === "admin") {
    return ["member", "viewer"].includes(targetRole)
  }

  // Members and viewers cannot manage roles
  return false
}

export function getAvailableRoles(currentRole: Role): Role[] {
  switch (currentRole) {
    case "owner":
      return ["admin", "member", "viewer"]
    case "admin":
      return ["member", "viewer"]
    default:
      return []
  }
}
