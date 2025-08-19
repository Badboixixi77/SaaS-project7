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
    const { priceId, userId } = await request.json()

    if (!priceId || !userId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = createClient()

    // Get user details
    const { data: profile } = await supabase.from("profiles").select("email").eq("id", userId).single()

    if (!profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer_email: profile.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/dashboard?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/pricing?canceled=true`,
      metadata: {
        userId,
      },
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          userId,
        },
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error("Stripe checkout error:", error)
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 })
  }
}
