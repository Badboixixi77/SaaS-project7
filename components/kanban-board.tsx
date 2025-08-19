"use client"

import { useState, useEffect } from "react"
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, MoreHorizontal, User, Calendar } from "lucide-react"
import CreateTaskDialog from "@/components/create-task-dialog"
import CreateTaskListDialog from "@/components/create-task-list-dialog"
import { updateTaskPosition, updateTaskList } from "@/lib/kanban-actions"
import { createClient } from "@/lib/supabase/client"
import { TaskDetailModal } from "@/components/task-detail-modal"

interface Task {
  id: string
  title: string
  description?: string
  priority: string
  position: number
  due_date?: string
  assignee_id?: string
  created_by?: string
  created_at: string
  assignee?: {
    email: string
  }
  user_profiles?: {
    full_name: string
    avatar_url?: string
  }
  creator?: {
    full_name: string
  }
}

interface TaskList {
  id: string
  name: string
  position: number
  tasks: Task[]
}

interface KanbanBoardProps {
  projectId: string
  taskLists: TaskList[]
  canEdit: boolean
}

export default function KanbanBoard({ projectId, taskLists, canEdit }: KanbanBoardProps) {
  const [lists, setLists] = useState<TaskList[]>(taskLists)
  const [selectedTaskList, setSelectedTaskList] = useState<string | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    const tasksChannel = supabase
      .channel(`project-${projectId}-tasks`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter: `task_list_id=in.(${lists.map((list) => list.id).join(",")})`,
        },
        (payload) => {
          console.log("Real-time task update:", payload)
          handleTaskUpdate(payload)
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "task_lists",
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          console.log("Real-time task list update:", payload)
          handleTaskListUpdate(payload)
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(tasksChannel)
    }
  }, [projectId, lists])

  const handleTaskUpdate = (payload: any) => {
    const { eventType, new: newRecord, old: oldRecord } = payload

    setLists((currentLists) => {
      const newLists = [...currentLists]

      if (eventType === "INSERT") {
        const listIndex = newLists.findIndex((list) => list.id === newRecord.task_list_id)
        if (listIndex !== -1) {
          const newTask: Task = {
            id: newRecord.id,
            title: newRecord.title,
            description: newRecord.description,
            priority: newRecord.priority,
            position: newRecord.position,
            due_date: newRecord.due_date,
            assignee_id: newRecord.assignee_id,
            created_by: newRecord.created_by,
            created_at: newRecord.created_at,
          }
          newLists[listIndex].tasks.push(newTask)
          newLists[listIndex].tasks.sort((a, b) => a.position - b.position)
        }
      } else if (eventType === "UPDATE") {
        const oldListIndex = newLists.findIndex((list) => list.tasks.some((task) => task.id === newRecord.id))
        const newListIndex = newLists.findIndex((list) => list.id === newRecord.task_list_id)

        if (oldListIndex !== -1) {
          const taskIndex = newLists[oldListIndex].tasks.findIndex((task) => task.id === newRecord.id)
          if (taskIndex !== -1) {
            newLists[oldListIndex].tasks.splice(taskIndex, 1)
          }
        }

        if (newListIndex !== -1) {
          const updatedTask: Task = {
            id: newRecord.id,
            title: newRecord.title,
            description: newRecord.description,
            priority: newRecord.priority,
            position: newRecord.position,
            due_date: newRecord.due_date,
            assignee_id: newRecord.assignee_id,
            created_by: newRecord.created_by,
            created_at: newRecord.created_at,
          }
          newLists[newListIndex].tasks.push(updatedTask)
          newLists[newListIndex].tasks.sort((a, b) => a.position - b.position)
        }
      } else if (eventType === "DELETE") {
        const listIndex = newLists.findIndex((list) => list.tasks.some((task) => task.id === oldRecord.id))
        if (listIndex !== -1) {
          newLists[listIndex].tasks = newLists[listIndex].tasks.filter((task) => task.id !== oldRecord.id)
        }
      }

      return newLists
    })
  }

  const handleTaskListUpdate = (payload: any) => {
    const { eventType, new: newRecord, old: oldRecord } = payload

    setLists((currentLists) => {
      if (eventType === "INSERT") {
        const newTaskList: TaskList = {
          id: newRecord.id,
          name: newRecord.name,
          position: newRecord.position,
          tasks: [],
        }
        const newLists = [...currentLists, newTaskList]
        return newLists.sort((a, b) => a.position - b.position)
      } else if (eventType === "UPDATE") {
        return currentLists.map((list) =>
          list.id === newRecord.id
            ? {
                ...list,
                name: newRecord.name,
                position: newRecord.position,
              }
            : list,
        )
      } else if (eventType === "DELETE") {
        return currentLists.filter((list) => list.id !== oldRecord.id)
      }

      return currentLists
    })
  }

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination || !canEdit) return

    const { source, destination, draggableId } = result

    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return
    }

    const sourceListIndex = lists.findIndex((list) => list.id === source.droppableId)
    const destListIndex = lists.findIndex((list) => list.id === destination.droppableId)

    if (sourceListIndex === -1 || destListIndex === -1) return

    const newLists = [...lists]
    const sourceList = { ...newLists[sourceListIndex] }
    const destList = sourceListIndex === destListIndex ? sourceList : { ...newLists[destListIndex] }

    const [movedTask] = sourceList.tasks.splice(source.index, 1)

    destList.tasks.splice(destination.index, 0, movedTask)

    sourceList.tasks.forEach((task, index) => {
      task.position = index
    })
    destList.tasks.forEach((task, index) => {
      task.position = index
    })

    newLists[sourceListIndex] = sourceList
    if (sourceListIndex !== destListIndex) {
      newLists[destListIndex] = destList
    }
    setLists(newLists)

    try {
      if (source.droppableId === destination.droppableId) {
        await updateTaskPosition(draggableId, destination.index)
      } else {
        await updateTaskList(draggableId, destination.droppableId, destination.index)
      }
    } catch (error) {
      console.error("Error updating task:", error)
      setLists(taskLists)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800 border-red-200"
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200"
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "low":
        return "bg-green-100 text-green-800 border-green-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task)
    setIsTaskModalOpen(true)
  }

  return (
    <div className="h-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Project Board</h2>
        {canEdit && <CreateTaskListDialog projectId={projectId} onSuccess={() => window.location.reload()} />}
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex space-x-6 overflow-x-auto pb-6">
          {lists.map((list) => (
            <div key={list.id} className="flex-shrink-0 w-80">
              <Card className="h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-gray-700">
                      {list.name} ({list.tasks.length})
                    </CardTitle>
                    <div className="flex items-center space-x-1">
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedTaskList(list.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <Droppable droppableId={list.id}>
                  {(provided, snapshot) => (
                    <CardContent
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`space-y-3 min-h-[200px] ${snapshot.isDraggingOver ? "bg-blue-50" : ""}`}
                    >
                      {list.tasks.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index} isDragDisabled={!canEdit}>
                          {(provided, snapshot) => (
                            <Card
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`cursor-pointer hover:shadow-md transition-shadow ${
                                snapshot.isDragging ? "shadow-lg rotate-2" : ""
                              }`}
                              onClick={() => handleTaskClick(task)}
                            >
                              <CardContent className="p-4">
                                <div className="space-y-3">
                                  <div className="flex items-start justify-between">
                                    <h3 className="font-medium text-gray-900 text-sm leading-tight">{task.title}</h3>
                                    <Badge className={`text-xs ${getPriorityColor(task.priority)}`}>
                                      {task.priority}
                                    </Badge>
                                  </div>

                                  {task.description && (
                                    <p className="text-xs text-gray-600 line-clamp-2">{task.description}</p>
                                  )}

                                  <div className="flex items-center justify-between text-xs text-gray-500">
                                    <div className="flex items-center space-x-2">
                                      {task.user_profiles && (
                                        <div className="flex items-center space-x-1">
                                          <User className="h-3 w-3" />
                                          <span>{task.user_profiles.full_name}</span>
                                        </div>
                                      )}
                                    </div>
                                    {task.due_date && (
                                      <div className="flex items-center space-x-1">
                                        <Calendar className="h-3 w-3" />
                                        <span>{new Date(task.due_date).toLocaleDateString()}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}

                      {list.tasks.length === 0 && (
                        <div className="text-center py-8 text-gray-400">
                          <p className="text-sm">No tasks yet</p>
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedTaskList(list.id)}
                              className="mt-2"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add task
                            </Button>
                          )}
                        </div>
                      )}
                    </CardContent>
                  )}
                </Droppable>
              </Card>
            </div>
          ))}

          {lists.length === 0 && (
            <div className="flex-1 flex items-center justify-center py-12">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">No task lists yet</h3>
                <p className="text-gray-600 mb-4">Create your first task list to start organizing tasks.</p>
                {canEdit && <CreateTaskListDialog projectId={projectId} onSuccess={() => window.location.reload()} />}
              </div>
            </div>
          )}
        </div>
      </DragDropContext>

      {selectedTaskList && (
        <CreateTaskDialog
          taskListId={selectedTaskList}
          open={!!selectedTaskList}
          onOpenChange={(open) => !open && setSelectedTaskList(null)}
          onSuccess={() => {
            setSelectedTaskList(null)
          }}
        />
      )}

      <TaskDetailModal
        task={selectedTask}
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false)
          setSelectedTask(null)
        }}
        onTaskUpdate={(updatedTask) => {
          setSelectedTask(updatedTask)
        }}
      />
    </div>
  )
}
