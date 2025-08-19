import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check, Star } from "lucide-react"
import Link from "next/link"

const plans = [
  {
    name: "Starter",
    description: "Perfect for small teams getting started",
    priceMonthly: 15,
    priceYearly: 150,
    stripePriceIdMonthly: "price_starter_monthly",
    stripePriceIdYearly: "price_starter_yearly",
    maxTeams: 1,
    maxProjects: 5,
    maxMembers: 5,
    features: ["Basic Kanban boards", "File attachments", "Comments", "Real-time collaboration", "Email support"],
    popular: false,
  },
  {
    name: "Professional",
    description: "For growing teams that need more power",
    priceMonthly: 49,
    priceYearly: 490,
    stripePriceIdMonthly: "price_pro_monthly",
    stripePriceIdYearly: "price_pro_yearly",
    maxTeams: 3,
    maxProjects: 20,
    maxMembers: 15,
    features: [
      "Everything in Starter",
      "Advanced analytics",
      "Custom fields",
      "Time tracking",
      "Priority support",
      "Team permissions",
    ],
    popular: true,
  },
  {
    name: "Enterprise",
    description: "For large organizations with advanced needs",
    priceMonthly: 99,
    priceYearly: 990,
    stripePriceIdMonthly: "price_enterprise_monthly",
    stripePriceIdYearly: "price_enterprise_yearly",
    maxTeams: "Unlimited",
    maxProjects: "Unlimited",
    maxMembers: "Unlimited",
    features: [
      "Everything in Professional",
      "SSO integration",
      "Advanced permissions",
      "API access",
      "Dedicated support",
      "Custom integrations",
    ],
    popular: false,
  },
]

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Choose Your Plan</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Start with our free trial, then choose the plan that fits your team's needs. All plans include a 14-day free
            trial.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <Card key={plan.name} className={`relative ${plan.popular ? "border-blue-500 shadow-lg scale-105" : ""}`}>
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white">
                  <Star className="w-3 h-3 mr-1" />
                  Most Popular
                </Badge>
              )}

              <CardHeader className="text-center">
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <div className="text-4xl font-bold text-gray-900">
                    ${plan.priceMonthly}
                    <span className="text-lg font-normal text-gray-600">/month</span>
                  </div>
                  <div className="text-sm text-gray-500">or ${plan.priceYearly}/year (save 17%)</div>
                </div>
              </CardHeader>

              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-sm">
                      Up to {plan.maxTeams} team{typeof plan.maxTeams === "number" && plan.maxTeams > 1 ? "s" : ""}
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-sm">{plan.maxProjects} projects per team</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-sm">{plan.maxMembers} members per team</span>
                  </li>
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter className="flex flex-col gap-2">
                <Button
                  className={`w-full ${plan.popular ? "bg-blue-600 hover:bg-blue-700" : ""}`}
                  variant={plan.popular ? "default" : "outline"}
                  asChild
                >
                  <Link href={`/checkout?plan=${plan.stripePriceIdMonthly}`}>Start Free Trial</Link>
                </Button>
                <Button variant="ghost" size="sm" className="w-full" asChild>
                  <Link href={`/checkout?plan=${plan.stripePriceIdYearly}`}>Choose Yearly (Save 17%)</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="text-center mt-16">
          <p className="text-gray-600 mb-4">
            Need a custom solution?{" "}
            <Link href="/contact" className="text-blue-600 hover:underline">
              Contact our sales team
            </Link>
          </p>
          <div className="flex justify-center gap-8 text-sm text-gray-500">
            <span>✓ 14-day free trial</span>
            <span>✓ No setup fees</span>
            <span>✓ Cancel anytime</span>
          </div>
        </div>
      </div>
    </div>
  )
}
