"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Loader2 } from "lucide-react"
import { createTask } from "@/lib/kanban-actions"
import { useEffect } from "react"

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Creating...
        </>
      ) : (
        "Create Task"
      )}
    </Button>
  )
}

interface CreateTaskDialogProps {
  taskListId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export default function CreateTaskDialog({ taskListId, open, onOpenChange, onSuccess }: CreateTaskDialogProps) {
  const [state, formAction] = useActionState(createTask, null)

  // Handle successful task creation
  useEffect(() => {
    if (state?.success) {
      onOpenChange(false)
    }
  }, [state, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
          <DialogDescription>Add a new task to this list.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          {state?.error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {state.error}
            </div>
          )}

          <input type="hidden" name="taskListId" value={taskListId} />

          <div className="space-y-2">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
              Task Title
            </label>
            <Input id="title" name="title" placeholder="Enter task title" required />
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description (optional)
            </label>
            <Textarea id="description" name="description" placeholder="Add task description" rows={3} />
          </div>

          <div className="space-y-2">
            <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
              Priority
            </label>
            <Select name="priority" defaultValue="medium">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700">
              Due Date (optional)
            </label>
            <Input id="dueDate" name="dueDate" type="date" />
          </div>

          <SubmitButton />
        </form>
      </DialogContent>
    </Dialog>
  )
}
