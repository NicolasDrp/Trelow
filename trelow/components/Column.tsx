"use client"

import type { Column as ColumnType, Task } from "@/types"
import TaskCard from "./TaskCard"
import { useDroppable } from "@dnd-kit/core"
import { useBoardStore } from "@/store/boardStore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, MoreHorizontal, X, Check, Trash2 } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown"
import { cn } from "@/lib/utils"

interface Props {
  column: ColumnType
  tasks: Task[]
}

export default function Column({ column, tasks }: Props) {
  const { addTask, deleteColumn, updateColumnTitle } = useBoardStore()
  const [isAddingTask, setIsAddingTask] = useState(false)
  const [newTaskContent, setNewTaskContent] = useState("")
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [title, setTitle] = useState(column.title)

  const inputRef = useRef<HTMLInputElement>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)

  const { setNodeRef } = useDroppable({
    id: column.id,
  })

  useEffect(() => {
    if (isAddingTask && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isAddingTask])

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus()
      titleInputRef.current.select()
    }
  }, [isEditingTitle])

  const handleAddTask = () => {
    if (newTaskContent.trim()) {
      addTask(column.id, newTaskContent)
      setNewTaskContent("")
    }
    setIsAddingTask(false)
  }

  const handleUpdateTitle = () => {
    if (title.trim()) {
      updateColumnTitle(column.id, title)
    } else {
      setTitle(column.title)
    }
    setIsEditingTitle(false)
  }

  const columnColor = column.color || "#64748b"
  const taskCount = tasks.length

  return (
      <div className="w-80 flex-shrink-0 flex flex-col rounded-lg bg-gray-50 shadow-sm border border-gray-200 overflow-hidden">
        {/* Column Header */}
        <div
            className="p-3 border-b border-gray-200 flex items-center justify-between"
            style={{ backgroundColor: `${columnColor}20` }}
        >
          <div className="flex items-center gap-2 flex-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: columnColor }} />

            {isEditingTitle ? (
                <div className="flex items-center gap-1 flex-1">
                  <Input
                      ref={titleInputRef}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="h-7 text-sm font-medium"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleUpdateTitle()
                        if (e.key === "Escape") {
                          setTitle(column.title)
                          setIsEditingTitle(false)
                        }
                      }}
                  />
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleUpdateTitle}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => {
                        setTitle(column.title)
                        setIsEditingTitle(false)
                      }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
            ) : (
                <div className="font-medium text-sm cursor-pointer" onClick={() => setIsEditingTitle(true)}>
                  {column.title} <span className="text-gray-500 font-normal">({taskCount})</span>
                </div>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditingTitle(true)}>Rename</DropdownMenuItem>
              <DropdownMenuItem onClick={() => deleteColumn(column.id)} className="text-red-600 focus:text-red-600">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Tasks Container */}
        <div
            ref={setNodeRef}
            className={cn(
                "flex-1 p-2 overflow-y-auto max-h-[calc(100vh-13rem)]",
                tasks.length === 0 && !isAddingTask && "flex items-center justify-center",
            )}
        >
          {tasks.length === 0 && !isAddingTask ? (
              <button
                  onClick={() => setIsAddingTask(true)}
                  className="text-sm text-gray-500 p-3 border-2 border-dashed border-gray-300 rounded-md hover:border-gray-400 hover:text-gray-600 transition-colors w-full text-center"
              >
                <Plus className="h-4 w-4 mx-auto mb-1" />
                Add a task
              </button>
          ) : (
              <div className="space-y-2">
                {tasks.map((task) => (
                    <TaskCard key={task.id} task={task} />
                ))}

                {isAddingTask && (
                    <div className="p-3 bg-white rounded-md border border-gray-200 shadow-sm space-y-2">
                      <Input
                          ref={inputRef}
                          value={newTaskContent}
                          onChange={(e) => setNewTaskContent(e.target.value)}
                          placeholder="Enter task content..."
                          className="text-sm"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleAddTask()
                            if (e.key === "Escape") setIsAddingTask(false)
                          }}
                      />
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => setIsAddingTask(false)}>
                          Cancel
                        </Button>
                        <Button size="sm" onClick={handleAddTask} disabled={!newTaskContent.trim()}>
                          Add
                        </Button>
                      </div>
                    </div>
                )}
              </div>
          )}
        </div>

        {/* Column Footer */}
        {!isAddingTask && tasks.length > 0 && (
            <div className="p-2 border-t border-gray-200">
              <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-gray-500 hover:text-gray-700"
                  onClick={() => setIsAddingTask(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add task
              </Button>
            </div>
        )}
      </div>
  )
}

