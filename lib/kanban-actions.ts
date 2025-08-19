"use server"

import { createServerActionClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

// Create task list action
export async function createTaskList(prevState: any, formData: FormData) {
  if (!formData) {
    return { error: "Form data is missing" }
  }

  const projectId = formData.get("projectId")
  const name = formData.get("name")

  if (!projectId || !name) {
    return { error: "Project ID and name are required" }
  }

  const cookieStore = cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: "You must be logged in" }
    }

    // Get the current max position for this project
    const { data: maxPosition } = await supabase
      .from("task_lists")
      .select("position")
      .eq("project_id", projectId)
      .order("position", { ascending: false })
      .limit(1)
      .single()

    const newPosition = (maxPosition?.position || -1) + 1

    // Create task list
    const { error } = await supabase.from("task_lists").insert({
      project_id: projectId,
      name: name.toString(),
      position: newPosition,
    })

    if (error) {
      return { error: error.message }
    }

    return { success: "Task list created successfully!" }
  } catch (error) {
    console.error("Create task list error:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }
}

// Create task action
export async function createTask(prevState: any, formData: FormData) {
  if (!formData) {
    return { error: "Form data is missing" }
  }

  const taskListId = formData.get("taskListId")
  const title = formData.get("title")
  const description = formData.get("description")
  const priority = formData.get("priority")
  const dueDate = formData.get("dueDate")

  if (!taskListId || !title) {
    return { error: "Task list ID and title are required" }
  }

  const cookieStore = cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: "You must be logged in" }
    }

    // Get the current max position for this task list
    const { data: maxPosition } = await supabase
      .from("tasks")
      .select("position")
      .eq("task_list_id", taskListId)
      .order("position", { ascending: false })
      .limit(1)
      .single()

    const newPosition = (maxPosition?.position || -1) + 1

    // Create task
    const { error } = await supabase.from("tasks").insert({
      task_list_id: taskListId,
      title: title.toString(),
      description: description?.toString() || null,
      priority: priority?.toString() || "medium",
      due_date: dueDate?.toString() || null,
      position: newPosition,
      created_by: user.id,
    })

    if (error) {
      return { error: error.message }
    }

    return { success: "Task created successfully!" }
  } catch (error) {
    console.error("Create task error:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }
}

// Update task position within same list
export async function updateTaskPosition(taskId: string, newPosition: number) {
  const cookieStore = cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

  const { error } = await supabase.from("tasks").update({ position: newPosition }).eq("id", taskId)

  if (error) {
    throw new Error(error.message)
  }
}

// Update task list and position (move between lists)
export async function updateTaskList(taskId: string, newTaskListId: string, newPosition: number) {
  const cookieStore = cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

  const { error } = await supabase
    .from("tasks")
    .update({
      task_list_id: newTaskListId,
      position: newPosition,
    })
    .eq("id", taskId)

  if (error) {
    throw new Error(error.message)
  }
}
