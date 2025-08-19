import { type NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@/lib/supabase/server"

function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    throw new Error("Stripe is not configured: missing STRIPE_SECRET_KEY")
  }
  return new Stripe(secretKey, { apiVersion: "2024-06-20" })
}

export async function POST(request: NextRequest) {
  try {
    const stripe = getStripe()
    const supabase = createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's subscription
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("team_id", user.id) // Assuming user's default team
      .single()

    if (!subscription) {
      return NextResponse.json({ error: "No subscription found" }, { status: 404 })
    }

    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/billing`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error("Portal session error:", error)
    return NextResponse.json({ error: "Failed to create portal session" }, { status: 500 })
  }
}
