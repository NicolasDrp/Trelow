"use client"

import type { Task } from "@/types"
import { useDraggable } from "@dnd-kit/core"
import { useBoardStore } from "@/store/boardStore"
import { Card, CardContent } from "@/components/ui/card"
import { Pencil, Trash2, GripVertical } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

interface Props {
  task: Task
}

export default function TaskCard({ task }: Props) {
  const { deleteTask, updateTask } = useBoardStore()
  const [isEditing, setIsEditing] = useState(false)
  const [content, setContent] = useState(task.content)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: task.id,
  })

  const style = transform
      ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 20,
      }
      : undefined

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleSave = () => {
    updateTask(task.id, content)
    setIsEditing(false)
  }

  const priorityColors = {
    low: "bg-blue-100 text-blue-800 hover:bg-blue-200",
    medium: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
    high: "bg-red-100 text-red-800 hover:bg-red-200",
  }

  const handlePriorityChange = (priority: "low" | "medium" | "high") => {
    updateTask(task.id, content, priority)
  }

  return (
      <Card
          ref={setNodeRef}
          style={style}
          className="bg-white shadow-sm border border-gray-200 rounded-md overflow-hidden group"
      >
        <CardContent className="p-3 relative">
          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
                onClick={() => setIsEditing(true)}
                className="text-gray-500 hover:text-gray-700 p-1 rounded-md hover:bg-gray-100"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
                onClick={() => deleteTask(task.id)}
                className="text-gray-500 hover:text-red-600 p-1 rounded-md hover:bg-gray-100"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex items-start gap-2">
            <div className="mt-1 cursor-grab touch-none" {...attributes} {...listeners}>
              <GripVertical className="h-4 w-4 text-gray-400" />
            </div>

            <div className="flex-1 min-w-0">
              {isEditing ? (
                  <div className="space-y-2">
                <textarea
                    ref={inputRef}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                    rows={3}
                />
                    <div className="flex justify-between">
                      <div className="flex gap-1">
                        <button
                            onClick={() => handlePriorityChange("low")}
                            className={cn(
                                "text-xs px-2 py-1 rounded-md",
                                task.priority === "low" ? priorityColors.low : "bg-gray-100 hover:bg-gray-200",
                            )}
                        >
                          Low
                        </button>
                        <button
                            onClick={() => handlePriorityChange("medium")}
                            className={cn(
                                "text-xs px-2 py-1 rounded-md",
                                task.priority === "medium" ? priorityColors.medium : "bg-gray-100 hover:bg-gray-200",
                            )}
                        >
                          Medium
                        </button>
                        <button
                            onClick={() => handlePriorityChange("high")}
                            className={cn(
                                "text-xs px-2 py-1 rounded-md",
                                task.priority === "high" ? priorityColors.high : "bg-gray-100 hover:bg-gray-200",
                            )}
                        >
                          High
                        </button>
                      </div>
                      <button
                          onClick={handleSave}
                          className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                      >
                        Save
                      </button>
                    </div>
                  </div>
              ) : (
                  <div className="space-y-2">
                    <p className="text-sm break-words pr-6">{task.content}</p>
                    <div className="flex items-center justify-between">
                      {task.priority && (
                          <Badge variant="outline" className={cn("text-xs", priorityColors[task.priority])}>
                            {task.priority}
                          </Badge>
                      )}
                      <span className="text-xs text-gray-400">{format(new Date(task.createdAt), "MMM d")}</span>
                    </div>
                  </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
  )
}

