"use client"

import { useState } from "react"
import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  useSensor,
  useSensors,
  PointerSensor,
} from "@dnd-kit/core"
import { useBoardStore } from "@/store/boardStore"
import Column from "./Column"
import TaskCard from "./TaskCard"
import { Button } from "@/components/ui/button"
import { Plus, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import type { Task } from "@/types"

export default function KanbanBoard() {
  const { columns, tasks, moveTask, addColumn } = useBoardStore()
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [isAddingColumn, setIsAddingColumn] = useState(false)
  const [newColumnTitle, setNewColumnTitle] = useState("")

  // Configure sensors for better touch/pointer handling
  const sensors = useSensors(
      useSensor(PointerSensor, {
        activationConstraint: {
          distance: 8,
        },
      }),
  )

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const activeTaskId = active.id.toString()
    const task = tasks.find((t) => t.id === activeTaskId)
    if (task) setActiveTask(task)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)

    if (!over) return

    const taskId = active.id
    const targetColumnId = over.id

    // Only move if dropping on a different column
    const task = tasks.find((t) => t.id === taskId)
    if (task && task.columnId !== targetColumnId.toString()) {
      moveTask(taskId, targetColumnId)
    }
  }

  const handleAddColumn = () => {
    if (newColumnTitle.trim()) {
      addColumn(newColumnTitle)
      setNewColumnTitle("")
    }
    setIsAddingColumn(false)
  }

  return (
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex flex-col h-full">
          <div className="p-4 flex items-center justify-between bg-white border-b">
            <h1 className="text-xl font-bold">Kanban Board</h1>
          </div>

          <div className="flex-1 overflow-x-auto p-4 bg-gray-100 min-h-[calc(100vh-5rem)]">
            <div className="flex gap-4 h-full">
              {columns.map((column) => (
                  <Column key={column.id} column={column} tasks={tasks.filter((task) => task.columnId === column.id)} />
              ))}

              {isAddingColumn ? (
                  <div className="w-80 flex-shrink-0 bg-white rounded-lg border border-gray-200 shadow-sm p-3 space-y-2">
                    <Input
                        value={newColumnTitle}
                        onChange={(e) => setNewColumnTitle(e.target.value)}
                        placeholder="Enter column title..."
                        className="text-sm"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddColumn()
                          if (e.key === "Escape") setIsAddingColumn(false)
                        }}
                    />
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => setIsAddingColumn(false)}>
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleAddColumn} disabled={!newColumnTitle.trim()}>
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </div>
                  </div>
              ) : (
                  <Button
                      variant="outline"
                      className="h-12 w-80 flex-shrink-0 border-dashed"
                      onClick={() => setIsAddingColumn(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Column
                  </Button>
              )}
            </div>
          </div>
        </div>

        <DragOverlay>{activeTask && <TaskCard task={activeTask} />}</DragOverlay>
      </DndContext>
  )
}

