import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { CheckCircle, Users, BarChart3 } from "lucide-react"

export default async function Home() {
  // If Supabase is not configured, show setup message
  if (!isSupabaseConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <h1 className="text-2xl font-bold mb-4">Connect Supabase to get started</h1>
      </div>
    )
  }

  // Check if user is already logged in
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If user is logged in, redirect to dashboard
  if (user) {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">TaskFlow</span>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/auth/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/auth/sign-up">
              <Button className="bg-blue-600 hover:bg-blue-700">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          Streamline Your Team's
          <span className="text-blue-600"> Project Management</span>
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
          Organize tasks, collaborate with your team, and track progress with our intuitive Kanban boards. Built for
          teams that want to get things done efficiently.
        </p>
        <div className="flex items-center justify-center space-x-4">
          <Link href="/auth/sign-up">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-3">
              Start Free Trial
            </Button>
          </Link>
          <Link href="/auth/login">
            <Button size="lg" variant="outline" className="text-lg px-8 py-3 bg-transparent">
              Sign In
            </Button>
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Everything you need to manage projects</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <Card className="text-center">
            <CardHeader>
              <CheckCircle className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <CardTitle>Kanban Boards</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Visualize your workflow with drag-and-drop Kanban boards. Move tasks through different stages
                effortlessly.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Users className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <CardTitle>Team Collaboration</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Invite team members, assign tasks, and collaborate in real-time. Keep everyone on the same page.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <BarChart3 className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <CardTitle>Analytics & Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Track team productivity and project progress with detailed analytics and reporting features.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <CheckCircle className="h-6 w-6" />
            <span className="text-xl font-bold">TaskFlow</span>
          </div>
          <p className="text-gray-400">Built with Next.js, Supabase, and Tailwind CSS</p>
        </div>
      </footer>
    </div>
  )
}
