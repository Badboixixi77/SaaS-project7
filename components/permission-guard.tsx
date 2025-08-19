"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { hasPermission, type Permission, type Resource } from "@/lib/permissions"

interface PermissionGuardProps {
  teamId: string
  permission: Permission
  resource: Resource
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function PermissionGuard({ teamId, permission, resource, children, fallback = null }: PermissionGuardProps) {
  const [hasAccess, setHasAccess] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkPermission()
  }, [teamId, permission, resource])

  const checkPermission = async () => {
    try {
      const access = await hasPermission(teamId, permission, resource)
      setHasAccess(access)
    } catch (error) {
      console.error("Permission check failed:", error)
      setHasAccess(false)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return null
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>
}
