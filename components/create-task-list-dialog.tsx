"use client"

import { useState } from "react"
import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Loader2 } from "lucide-react"
import { createTaskList } from "@/lib/kanban-actions"
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
        "Create List"
      )}
    </Button>
  )
}

interface CreateTaskListDialogProps {
  projectId: string
  onSuccess?: () => void
}

export default function CreateTaskListDialog({ projectId, onSuccess }: CreateTaskListDialogProps) {
  const [open, setOpen] = useState(false)
  const [state, formAction] = useActionState(createTaskList, null)

  // Handle successful task list creation
  useEffect(() => {
    if (state?.success) {
      setOpen(false)
    }
  }, [state])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add List
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Task List</DialogTitle>
          <DialogDescription>Add a new column to organize your tasks.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          {state?.error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {state.error}
            </div>
          )}

          <input type="hidden" name="projectId" value={projectId} />

          <div className="space-y-2">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              List Name
            </label>
            <Input id="name" name="name" placeholder="e.g., To Do, In Progress, Done" required />
          </div>

          <SubmitButton />
        </form>
      </DialogContent>
    </Dialog>
  )
}
