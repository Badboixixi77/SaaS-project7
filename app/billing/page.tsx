"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { Calendar, CreditCard, Users, Zap } from "lucide-react"
import Link from "next/link"

interface Subscription {
  id: string
  status: string
  current_period_end: string
  cancel_at_period_end: boolean
  plan: {
    name: string
    description: string
    price_monthly: number
    max_teams: number
    max_projects_per_team: number
    max_members_per_team: number
    features: string[]
  }
}

export default function BillingPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchSubscription()
  }, [])

  const fetchSubscription = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from("subscriptions")
        .select(`
          *,
          plan:subscription_plans(*)
        `)
        .eq("team_id", user.id) // Assuming user's default team
        .eq("status", "active")
        .single()

      setSubscription(data)
    } catch (error) {
      console.error("Error fetching subscription:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleManageBilling = async () => {
    try {
      const response = await fetch("/api/stripe/create-portal-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const { url } = await response.json()
      if (url) {
        window.location.href = url
      }
    } catch (error) {
      console.error("Error creating portal session:", error)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Billing & Subscription</h1>
        <p className="text-gray-600">Manage your subscription and billing information</p>
      </div>

      {subscription ? (
        <div className="grid gap-6">
          {/* Current Plan */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-blue-500" />
                    {subscription.plan.name} Plan
                  </CardTitle>
                  <CardDescription>{subscription.plan.description}</CardDescription>
                </div>
                <Badge variant={subscription.status === "active" ? "default" : "secondary"}>
                  {subscription.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">Up to {subscription.plan.max_teams} teams</span>
                </div>
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">{subscription.plan.max_projects_per_team} projects per team</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">
                    Renews {new Date(subscription.current_period_end).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {subscription.cancel_at_period_end && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    Your subscription will be canceled at the end of the current billing period.
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={handleManageBilling}>Manage Billing</Button>
                <Button variant="outline" asChild>
                  <Link href="/pricing">View All Plans</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Plan Features */}
          <Card>
            <CardHeader>
              <CardTitle>Plan Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {subscription.plan.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No Active Subscription</CardTitle>
            <CardDescription>You don't have an active subscription. Choose a plan to get started.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/pricing">View Plans</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
