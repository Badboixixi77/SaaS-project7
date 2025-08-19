"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { Clock, Users, CheckCircle, Activity } from "lucide-react"

interface AnalyticsData {
  totalTasks: number
  completedTasks: number
  inProgressTasks: number
  totalTimeHours: number
  activeUsers: number
  completionRate: number
  dailyActivity: Array<{
    date: string
    created: number
    completed: number
  }>
  tasksByPriority: Array<{
    priority: string
    count: number
    color: string
  }>
  teamProductivity: Array<{
    user: string
    tasksCompleted: number
    timeSpent: number
  }>
}

const COLORS = {
  low: "#10b981",
  medium: "#f59e0b",
  high: "#f97316",
  urgent: "#ef4444",
}

export default function AnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState("7d")
  const [selectedTeam, setSelectedTeam] = useState<string>("")
  const [teams, setTeams] = useState<Array<{ id: string; name: string }>>([])

  const supabase = createClient()

  useEffect(() => {
    fetchTeams()
  }, [])

  useEffect(() => {
    if (selectedTeam) {
      fetchAnalytics()
    }
  }, [selectedTeam, timeRange])

  const fetchTeams = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from("team_members")
      .select(`
        team:teams(id, name)
      `)
      .eq("user_id", user.id)

    if (data) {
      const teamList = data.map((item) => item.team).filter(Boolean)
      setTeams(teamList)
      if (teamList.length > 0 && !selectedTeam) {
        setSelectedTeam(teamList[0].id)
      }
    }
  }

  const fetchAnalytics = async () => {
    if (!selectedTeam) return

    setLoading(true)
    try {
      const endDate = new Date()
      const startDate = new Date()

      switch (timeRange) {
        case "7d":
          startDate.setDate(endDate.getDate() - 7)
          break
        case "30d":
          startDate.setDate(endDate.getDate() - 30)
          break
        case "90d":
          startDate.setDate(endDate.getDate() - 90)
          break
      }

      // Fetch task statistics
      const { data: taskStats } = await supabase
        .from("tasks")
        .select(`
          id,
          status,
          priority,
          created_at,
          completed_at,
          project:projects!inner(team_id)
        `)
        .eq("project.team_id", selectedTeam)
        .gte("created_at", startDate.toISOString())

      // Fetch time entries
      const { data: timeEntries } = await supabase
        .from("time_entries")
        .select(`
          duration_minutes,
          user_id,
          task:tasks!inner(
            project:projects!inner(team_id)
          )
        `)
        .eq("task.project.team_id", selectedTeam)
        .gte("started_at", startDate.toISOString())
        .not("duration_minutes", "is", null)

      // Fetch daily activity
      const { data: dailyStats } = await supabase
        .from("team_analytics")
        .select("*")
        .eq("team_id", selectedTeam)
        .gte("date", startDate.toISOString().split("T")[0])
        .order("date")

      // Process the data
      const totalTasks = taskStats?.length || 0
      const completedTasks = taskStats?.filter((task) => task.status === "done").length || 0
      const inProgressTasks = taskStats?.filter((task) => task.status === "in_progress").length || 0
      const totalTimeMinutes = timeEntries?.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0) || 0
      const activeUsers = new Set(timeEntries?.map((entry) => entry.user_id)).size

      // Task priority distribution
      const priorityCounts =
        taskStats?.reduce(
          (acc, task) => {
            acc[task.priority] = (acc[task.priority] || 0) + 1
            return acc
          },
          {} as Record<string, number>,
        ) || {}

      const tasksByPriority = Object.entries(priorityCounts).map(([priority, count]) => ({
        priority: priority.charAt(0).toUpperCase() + priority.slice(1),
        count,
        color: COLORS[priority as keyof typeof COLORS],
      }))

      // Daily activity chart data
      const dailyActivity =
        dailyStats?.map((stat) => ({
          date: new Date(stat.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          created: stat.tasks_created,
          completed: stat.tasks_completed,
        })) || []

      // Team productivity (mock data for now)
      const teamProductivity = [
        { user: "John Doe", tasksCompleted: 12, timeSpent: 45 },
        { user: "Jane Smith", tasksCompleted: 8, timeSpent: 32 },
        { user: "Mike Johnson", tasksCompleted: 15, timeSpent: 52 },
      ]

      setAnalyticsData({
        totalTasks,
        completedTasks,
        inProgressTasks,
        totalTimeHours: Math.round((totalTimeMinutes / 60) * 10) / 10,
        activeUsers,
        completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        dailyActivity,
        tasksByPriority,
        teamProductivity,
      })
    } catch (error) {
      console.error("Error fetching analytics:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
          <p className="text-gray-600">Track your team's productivity and performance</p>
        </div>
        <div className="flex gap-4">
          <Select value={selectedTeam} onValueChange={setSelectedTeam}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select team" />
            </SelectTrigger>
            <SelectContent>
              {teams.map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {analyticsData && (
        <div className="space-y-8">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData.totalTasks}</div>
                <p className="text-xs text-muted-foreground">
                  {analyticsData.completedTasks} completed, {analyticsData.inProgressTasks} in progress
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData.completionRate}%</div>
                <Badge variant={analyticsData.completionRate >= 70 ? "default" : "secondary"} className="mt-1">
                  {analyticsData.completionRate >= 70 ? "Good" : "Needs Improvement"}
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Time Tracked</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData.totalTimeHours}h</div>
                <p className="text-xs text-muted-foreground">
                  Avg {Math.round((analyticsData.totalTimeHours / Math.max(analyticsData.completedTasks, 1)) * 10) / 10}
                  h per task
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData.activeUsers}</div>
                <p className="text-xs text-muted-foreground">Contributing to projects</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Daily Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Activity</CardTitle>
                <CardDescription>Tasks created vs completed over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData.dailyActivity}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="created" fill="#3b82f6" name="Created" />
                    <Bar dataKey="completed" fill="#10b981" name="Completed" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Task Priority Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Task Priority Distribution</CardTitle>
                <CardDescription>Breakdown of tasks by priority level</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analyticsData.tasksByPriority}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ priority, count }) => `${priority}: ${count}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {analyticsData.tasksByPriority.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Team Productivity */}
          <Card>
            <CardHeader>
              <CardTitle>Team Productivity</CardTitle>
              <CardDescription>Individual performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData.teamProductivity.map((member) => (
                  <div key={member.user} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-600">
                          {member.user
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{member.user}</p>
                        <p className="text-sm text-gray-500">{member.tasksCompleted} tasks completed</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{member.timeSpent}h</p>
                      <p className="text-sm text-gray-500">Time tracked</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
