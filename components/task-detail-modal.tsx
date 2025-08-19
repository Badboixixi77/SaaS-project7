"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { Upload, Paperclip, Download, Trash2, Send, Calendar, User, Flag } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface Task {
  id: string
  title: string
  description: string | null
  priority: "low" | "medium" | "high" | "urgent"
  due_date: string | null
  created_at: string
  assignee_id: string | null
  assignee?: {
    email: string
  }
}

interface Comment {
  id: string
  content: string
  created_at: string
  user_id: string
  user: {
    email: string
  }
}

interface Attachment {
  id: string
  filename: string
  file_url: string
  file_size: number
  created_at: string
  user: {
    email: string
  }
}

interface TaskDetailModalProps {
  task: Task | null
  isOpen: boolean
  onClose: () => void
  onTaskUpdate: (task: Task) => void
}

const priorityColors = {
  low: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-red-100 text-red-800",
}

export function TaskDetailModal({ task, isOpen, onClose, onTaskUpdate }: TaskDetailModalProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [newComment, setNewComment] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (task && isOpen) {
      fetchComments()
      fetchAttachments()

      // Subscribe to real-time updates for comments
      const commentsChannel = supabase
        .channel(`task-comments-${task.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "comments", filter: `task_id=eq.${task.id}` },
          () => fetchComments(),
        )
        .subscribe()

      // Subscribe to real-time updates for attachments
      const attachmentsChannel = supabase
        .channel(`task-attachments-${task.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "attachments", filter: `task_id=eq.${task.id}` },
          () => fetchAttachments(),
        )
        .subscribe()

      return () => {
        supabase.removeChannel(commentsChannel)
        supabase.removeChannel(attachmentsChannel)
      }
    }
  }, [task, isOpen])

  const fetchComments = async () => {
    if (!task) return

    const { data } = await supabase
      .from("comments")
      .select(`
        *,
        user:profiles(email)
      `)
      .eq("task_id", task.id)
      .order("created_at", { ascending: true })

    if (data) {
      setComments(data)
    }
  }

  const fetchAttachments = async () => {
    if (!task) return

    const { data } = await supabase
      .from("attachments")
      .select(`
        *,
        user:profiles(email)
      `)
      .eq("task_id", task.id)
      .order("created_at", { ascending: false })

    if (data) {
      setAttachments(data)
    }
  }

  const handleAddComment = async () => {
    if (!task || !newComment.trim()) return

    setIsSubmittingComment(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      const { error } = await supabase.from("comments").insert({
        task_id: task.id,
        content: newComment.trim(),
        user_id: user.id,
      })

      if (!error) {
        setNewComment("")
      }
    }
    setIsSubmittingComment(false)
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !task) return

    setIsUploading(true)

    try {
      // Upload to Blob
      const formData = new FormData()
      formData.append("file", file)
      formData.append("taskId", task.id)

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!uploadResponse.ok) throw new Error("Upload failed")

      const { url, filename, size } = await uploadResponse.json()

      // Save to database
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        await supabase.from("attachments").insert({
          task_id: task.id,
          filename,
          file_url: url,
          file_size: size,
          user_id: user.id,
        })
      }
    } catch (error) {
      console.error("Upload error:", error)
    } finally {
      setIsUploading(false)
      // Reset file input
      event.target.value = ""
    }
  }

  const handleDeleteAttachment = async (attachment: Attachment) => {
    try {
      // Delete from Blob
      await fetch("/api/delete-attachment", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: attachment.file_url }),
      })

      // Delete from database
      await supabase.from("attachments").delete().eq("id", attachment.id)
    } catch (error) {
      console.error("Delete error:", error)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  if (!task) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>{task.title}</span>
            <Badge className={priorityColors[task.priority]}>
              <Flag className="w-3 h-3 mr-1" />
              {task.priority}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-muted-foreground">{task.description || "No description provided"}</p>
            </div>

            {/* Comments */}
            <div>
              <h3 className="font-semibold mb-4">Comments ({comments.length})</h3>

              {/* Add Comment */}
              <div className="flex gap-2 mb-4">
                <Textarea
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="flex-1"
                  rows={2}
                />
                <Button onClick={handleAddComment} disabled={!newComment.trim() || isSubmittingComment} size="sm">
                  <Send className="w-4 h-4" />
                </Button>
              </div>

              {/* Comments List */}
              <div className="space-y-3">
                {comments.map((comment) => (
                  <Card key={comment.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback>{comment.user.email.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{comment.user.email}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-sm">{comment.content}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {comments.length === 0 && <p className="text-muted-foreground text-center py-4">No comments yet</p>}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Task Details */}
            <Card>
              <CardContent className="p-4 space-y-4">
                <h3 className="font-semibold">Details</h3>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Assignee:</span>
                    <span>{task.assignee?.email || "Unassigned"}</span>
                  </div>

                  {task.due_date && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Due:</span>
                      <span>{new Date(task.due_date).toLocaleDateString()}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Created:</span>
                    <span>{formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Attachments */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Attachments ({attachments.length})</h3>
                  <div>
                    <input
                      type="file"
                      id="file-upload"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById("file-upload")?.click()}
                      disabled={isUploading}
                    >
                      <Upload className="w-4 h-4 mr-1" />
                      {isUploading ? "Uploading..." : "Upload"}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  {attachments.map((attachment) => (
                    <div key={attachment.id} className="flex items-center gap-2 p-2 border rounded-lg">
                      <Paperclip className="w-4 h-4 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{attachment.filename}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(attachment.file_size)} • {attachment.user.email}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => window.open(attachment.file_url, "_blank")}>
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteAttachment(attachment)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {attachments.length === 0 && (
                    <p className="text-muted-foreground text-center py-4 text-sm">No attachments</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
