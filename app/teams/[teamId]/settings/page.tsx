"use client"

import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RoleManagement } from "@/components/role-management"
import { PermissionGuard } from "@/components/permission-guard"
import { Settings, CreditCard } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function TeamSettingsPage() {
  const params = useParams()
  const teamId = params.teamId as string

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Team Settings</h1>
        <p className="text-gray-600">Manage your team configuration and member permissions</p>
      </div>

      <div className="grid gap-8">
        {/* Team Members & Roles */}
        <PermissionGuard teamId={teamId} permission="read" resource="team">
          <RoleManagement teamId={teamId} />
        </PermissionGuard>

        {/* Team Information */}
        <PermissionGuard teamId={teamId} permission="update" resource="team">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Team Information
              </CardTitle>
              <CardDescription>Update your team's basic information</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">Team information management coming soon...</p>
            </CardContent>
          </Card>
        </PermissionGuard>

        {/* Billing Management */}
        <PermissionGuard teamId={teamId} permission="manage_billing" resource="team">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Billing & Subscription
              </CardTitle>
              <CardDescription>Manage your team's subscription and billing information</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/billing">Manage Billing</Link>
              </Button>
            </CardContent>
          </Card>
        </PermissionGuard>
      </div>
    </div>
  )
}
