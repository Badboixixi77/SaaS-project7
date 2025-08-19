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
import { createTeam } from "@/lib/actions"
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
        "Create Team"
      )}
    </Button>
  )
}

export default function CreateTeamDialog() {
  const [open, setOpen] = useState(false)
  const [state, formAction] = useActionState(createTeam, null)
  const router = useRouter()

  // Handle successful team creation
  useEffect(() => {
    if (state?.success && state?.teamId) {
      setOpen(false)
      router.refresh()
    }
  }, [state, router])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Team
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Team</DialogTitle>
          <DialogDescription>Create a team to collaborate with others on projects.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          {state?.error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {state.error}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Team Name
            </label>
            <Input id="name" name="name" placeholder="Enter team name" required />
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description (optional)
            </label>
            <Textarea id="description" name="description" placeholder="What's this team about?" rows={3} />
          </div>

          <SubmitButton />
        </form>
      </DialogContent>
    </Dialog>
  )
}
