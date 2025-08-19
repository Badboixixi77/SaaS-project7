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

function getWebhookSecret() {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    throw new Error("Stripe webhook is not configured: missing STRIPE_WEBHOOK_SECRET")
  }
  return secret
}

export async function POST(request: NextRequest) {
  try {
    const stripe = getStripe()
    const webhookSecret = getWebhookSecret()
    const body = await request.text()
    const signature = request.headers.get("stripe-signature")!

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error("Webhook signature verification failed:", err)
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    const supabase = createClient()

    // Log the event
    await supabase.from("billing_events").insert({
      stripe_event_id: event.id,
      event_type: event.type,
      data: event.data,
    })

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string)

        // Get the plan details
        const priceId = subscription.items.data[0].price.id
        const { data: plan } = await supabase
          .from("subscription_plans")
          .select("*")
          .or(`stripe_price_id_monthly.eq.${priceId},stripe_price_id_yearly.eq.${priceId}`)
          .single()

        if (plan && session.metadata?.userId) {
          // Create or get the user's default team
          let { data: team } = await supabase
            .from("teams")
            .select("id")
            .eq("created_by", session.metadata.userId)
            .single()

          if (!team) {
            const { data: newTeam } = await supabase
              .from("teams")
              .insert({
                name: "My Team",
                created_by: session.metadata.userId,
              })
              .select("id")
              .single()

            if (newTeam) {
              team = newTeam
              // Add user as team owner
              await supabase.from("team_members").insert({
                team_id: newTeam.id,
                user_id: session.metadata.userId,
                role: "owner",
              })
            }
          }

          if (team) {
            // Create subscription record
            await supabase.from("subscriptions").insert({
              team_id: team.id,
              plan_id: plan.id,
              stripe_subscription_id: subscription.id,
              stripe_customer_id: subscription.customer as string,
              status: subscription.status,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            })
          }
        }
        break
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)

          // Update subscription status
          await supabase
            .from("subscriptions")
            .update({
              status: subscription.status,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            })
            .eq("stripe_subscription_id", subscription.id)
        }
        break
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice
        if (invoice.subscription) {
          await supabase
            .from("subscriptions")
            .update({ status: "past_due" })
            .eq("stripe_subscription_id", invoice.subscription as string)
        }
        break
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription

        await supabase
          .from("subscriptions")
          .update({
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
          })
          .eq("stripe_subscription_id", subscription.id)
        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription

        await supabase
          .from("subscriptions")
          .update({ status: "canceled" })
          .eq("stripe_subscription_id", subscription.id)
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
  }
}
