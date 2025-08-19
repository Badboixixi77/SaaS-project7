"use client"

import { useState } from "react"
import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Loader2 } from "lucide-react"
import { createProject } from "@/lib/actions"
import { useRouter } from "next/navigation"
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
        "Create Project"
      )}
    </Button>
  )
}

interface CreateProjectDialogProps {
  teamId: string
}

export default function CreateProjectDialog({ teamId }: CreateProjectDialogProps) {
  const [open, setOpen] = useState(false)
  const [state, formAction] = useActionState(createProject, null)
  const router = useRouter()

  // Handle successful project creation
  useEffect(() => {
    if (state?.success && state?.projectId) {
      setOpen(false)
      router.refresh()
    }
  }, [state, router])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>Create a project to organize tasks and collaborate with your team.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          {state?.error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {state.error}
            </div>
          )}

          <input type="hidden" name="teamId" value={teamId} />

          <div className="space-y-2">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Project Name
            </label>
            <Input id="name" name="name" placeholder="Enter project name" required />
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description (optional)
            </label>
            <Textarea id="description" name="description" placeholder="What's this project about?" rows={3} />
          </div>

          <SubmitButton />
        </form>
      </DialogContent>
    </Dialog>
  )
}
