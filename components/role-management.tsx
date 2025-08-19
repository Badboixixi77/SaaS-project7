"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { createClient } from "@/lib/supabase/client"
import {
  getUserRole,
  hasPermission,
  canManageRole,
  getAvailableRoles,
  ROLE_DESCRIPTIONS,
  type Role,
} from "@/lib/permissions"
import { Users, Shield, Crown, Eye, UserCheck } from "lucide-react"

interface TeamMember {
  id: string
  user_id: string
  role: Role
  joined_at: string
  user: {
    email: string
  }
}

interface RoleManagementProps {
  teamId: string
}

const roleIcons = {
  owner: Crown,
  admin: Shield,
  member: UserCheck,
  viewer: Eye,
}

const roleColors = {
  owner: "bg-purple-100 text-purple-800",
  admin: "bg-blue-100 text-blue-800",
  member: "bg-green-100 text-green-800",
  viewer: "bg-gray-100 text-gray-800",
}

export function RoleManagement({ teamId }: RoleManagementProps) {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [currentUserRole, setCurrentUserRole] = useState<Role | null>(null)
  const [canManageMembers, setCanManageMembers] = useState(false)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchMembers()
    checkPermissions()
  }, [teamId])

  const fetchMembers = async () => {
    const { data } = await supabase
      .from("team_members")
      .select(`
        *,
        user:profiles(email)
      `)
      .eq("team_id", teamId)
      .order("role", { ascending: false })
      .order("joined_at", { ascending: true })

    if (data) {
      setMembers(data)
    }
    setLoading(false)
  }

  const checkPermissions = async () => {
    const role = await getUserRole(teamId)
    setCurrentUserRole(role)

    if (role) {
      const canManage = await hasPermission(teamId, "manage_members", "team")
      setCanManageMembers(canManage)
    }
  }

  const updateMemberRole = async (memberId: string, newRole: Role) => {
    const { error } = await supabase.from("team_members").update({ role: newRole }).eq("id", memberId)

    if (!error) {
      fetchMembers()
    }
  }

  const removeMember = async (memberId: string) => {
    const { error } = await supabase.from("team_members").delete().eq("id", memberId)

    if (!error) {
      fetchMembers()
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Team Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Team Members ({members.length})
        </CardTitle>
        <CardDescription>Manage team member roles and permissions</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {members.map((member) => {
          const RoleIcon = roleIcons[member.role]
          const canManageThisMember = currentUserRole && canManageRole(currentUserRole, member.role)
          const availableRoles = currentUserRole ? getAvailableRoles(currentUserRole) : []

          return (
            <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>{member.user.email.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{member.user.email}</p>
                  <p className="text-sm text-gray-500">Joined {new Date(member.joined_at).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Badge className={roleColors[member.role]}>
                  <RoleIcon className="w-3 h-3 mr-1" />
                  {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                </Badge>

                {canManageMembers && canManageThisMember && (
                  <div className="flex gap-2">
                    <Select value={member.role} onValueChange={(newRole: Role) => updateMemberRole(member.id, newRole)}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRoles.map((role) => (
                          <SelectItem key={role} value={role}>
                            {role.charAt(0).toUpperCase() + role.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeMember(member.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Remove
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {/* Role Descriptions */}
        <div className="mt-8 space-y-3">
          <h4 className="font-medium text-sm text-gray-700">Role Permissions</h4>
          {Object.entries(ROLE_DESCRIPTIONS).map(([role, description]) => {
            const RoleIcon = roleIcons[role as Role]
            return (
              <div key={role} className="flex items-start gap-2 text-sm">
                <Badge className={`${roleColors[role as Role]} mt-0.5`} variant="secondary">
                  <RoleIcon className="w-3 h-3 mr-1" />
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </Badge>
                <p className="text-gray-600 flex-1">{description}</p>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
