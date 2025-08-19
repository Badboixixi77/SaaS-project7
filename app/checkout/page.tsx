"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { Loader2 } from "lucide-react"

export default function CheckoutPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const planId = searchParams.get("plan")

  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push("/auth/login?redirect=/checkout")
        return
      }
      setUser(user)
    }
    getUser()
  }, [])

  const handleCheckout = async () => {
    if (!planId || !user) return

    setIsLoading(true)
    try {
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          priceId: planId,
          userId: user.id,
        }),
      })

      const { url, error } = await response.json()

      if (error) {
        console.error("Checkout error:", error)
        return
      }

      if (url) {
        window.location.href = url
      }
    } catch (error) {
      console.error("Checkout error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Complete Your Subscription</CardTitle>
          <CardDescription>You'll be redirected to Stripe to complete your payment securely.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-4">
              Signed in as: <strong>{user.email}</strong>
            </p>
          </div>

          <Button onClick={handleCheckout} disabled={isLoading || !planId} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating checkout session...
              </>
            ) : (
              "Continue to Payment"
            )}
          </Button>

          <div className="text-center">
            <p className="text-xs text-gray-500">Secure payment powered by Stripe</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
