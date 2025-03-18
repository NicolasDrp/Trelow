"use client";

import type { Column as ColumnType, Task } from "@/types";
import TaskCard from "./TaskCard";
import { useDroppable } from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, MoreHorizontal, X, Check, Trash2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown";
import { cn } from "@/lib/utils";

interface Props {
  column: ColumnType;
  tasks: Task[];
  boardId: string;
  onBoardUpdate: () => void;
  onUpdateColumn?: (columnId: string, title: string) => void;
  onDeleteColumn?: (columnId: string) => void;
  onAddTask?: (
    columnId: string,
    task: { title: string; priority: "low" | "medium" | "high" }
  ) => void;
  onUpdateTask?: (taskId: string, task: any) => void;
  onDeleteTask?: (taskId: string) => void;
}

export default function Column({
  column,
  tasks,
  boardId,
  onBoardUpdate,
  onUpdateColumn,
  onDeleteColumn,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
}: Props) {
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskContent, setNewTaskContent] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<
    "low" | "medium" | "high"
  >("medium");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(column.title);

  const inputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const { setNodeRef } = useDroppable({
    id: column.id,
  });

  useEffect(() => {
    if (isAddingTask && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAddingTask]);

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  const handleAddTask = async () => {
    if (!newTaskContent.trim()) return;

    if (onAddTask) {
      // Use optimistic update if handler provided
      onAddTask(column.id, {
        title: newTaskContent,
        priority: newTaskPriority,
      });

      setNewTaskContent("");
      setNewTaskPriority("medium");
      setIsAddingTask(false);
      return;
    }

    // Fallback to original implementation
    try {
      const response = await fetch(`/api/columns/${column.id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTaskContent,
          priority: newTaskPriority,
        }),
      });

      if (response.ok) {
        onBoardUpdate();
        setNewTaskContent("");
        setNewTaskPriority("medium");
      }
    } catch (error) {
      console.error("Error adding task:", error);
    }
    setIsAddingTask(false);
  };

  const handleUpdateTitle = async () => {
    if (!title.trim() || title === column.title) {
      setTitle(column.title);
      setIsEditingTitle(false);
      return;
    }

    if (onUpdateColumn) {
      // Use optimistic update if handler provided
      onUpdateColumn(column.id, title);
      setIsEditingTitle(false);
      return;
    }

    // Fallback to original implementation
    try {
      const response = await fetch(`/api/columns/${column.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
        }),
      });

      if (response.ok) {
        onBoardUpdate();
      } else {
        setTitle(column.title); // Revert on error
      }
    } catch (error) {
      console.error("Error updating column title:", error);
      setTitle(column.title); // Revert on error
    }
    setIsEditingTitle(false);
  };

  const handleDeleteColumn = async () => {
    if (onDeleteColumn) {
      // Use optimistic update if handler provided
      onDeleteColumn(column.id);
      return;
    }

    // Fallback to original implementation
    try {
      const response = await fetch(`/api/columns/${column.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        onBoardUpdate();
      }
    } catch (error) {
      console.error("Error deleting column:", error);
    }
  };

  const columnColor = column.color || "#64748b";
  const taskCount = tasks.length;

  return (
    <div className="w-80 flex-shrink-0 flex flex-col rounded-lg bg-gray-50 shadow-sm border border-gray-200 overflow-hidden">
      {/* Column Header */}
      <div
        className="p-3 border-b border-gray-200 flex items-center justify-between"
        style={{ backgroundColor: `${columnColor}20` }}
      >
        <div className="flex items-center gap-2 flex-1">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: columnColor }}
          />

          {isEditingTitle ? (
            <div className="flex items-center gap-1 flex-1">
              <Input
                ref={titleInputRef}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-7 text-sm font-medium"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleUpdateTitle();
                  if (e.key === "Escape") {
                    setTitle(column.title);
                    setIsEditingTitle(false);
                  }
                }}
              />
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={handleUpdateTitle}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={() => {
                  setTitle(column.title);
                  setIsEditingTitle(false);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div
              className="font-medium text-sm cursor-pointer"
              onClick={() => setIsEditingTitle(true)}
            >
              {column.title}{" "}
              <span className="text-gray-500 font-normal">({taskCount})</span>
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
            <DropdownMenuItem onClick={() => setIsEditingTitle(true)}>
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleDeleteColumn}
              className="text-red-600 focus:text-red-600"
            >
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
          tasks.length === 0 &&
            !isAddingTask &&
            "flex items-center justify-center"
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
              <TaskCard
                key={task.id}
                task={task}
                onUpdate={onBoardUpdate}
                onUpdateTask={onUpdateTask}
                onDeleteTask={onDeleteTask}
              />
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
                    if (e.key === "Enter") handleAddTask();
                    if (e.key === "Escape") setIsAddingTask(false);
                  }}
                />
                <div className="flex justify-between">
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className={cn(
                        "text-xs",
                        newTaskPriority === "low"
                          ? "bg-blue-100 text-blue-800"
                          : ""
                      )}
                      onClick={() => setNewTaskPriority("low")}
                    >
                      Low
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className={cn(
                        "text-xs",
                        newTaskPriority === "medium"
                          ? "bg-yellow-100 text-yellow-800"
                          : ""
                      )}
                      onClick={() => setNewTaskPriority("medium")}
                    >
                      Medium
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className={cn(
                        "text-xs",
                        newTaskPriority === "high"
                          ? "bg-red-100 text-red-800"
                          : ""
                      )}
                      onClick={() => setNewTaskPriority("high")}
                    >
                      High
                    </Button>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsAddingTask(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleAddTask}
                    disabled={!newTaskContent.trim()}
                  >
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
  );
}
