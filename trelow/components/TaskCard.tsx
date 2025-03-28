"use client";

import type { Task } from "@/types";
import { useDraggable } from "@dnd-kit/core";
import { Card, CardContent } from "@/components/ui/card";
import { Pencil, Trash2, GripVertical } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface Props {
  task: Task;
  onUpdate?: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onUpdateTask?: (taskId: string, task: any) => void;
  onDeleteTask?: (taskId: string) => void;
}

export default function TaskCard({
  task,
  onUpdate,
  onUpdateTask,
  onDeleteTask,
}: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(task.content);
  const [priority, setPriority] = useState<"low" | "medium" | "high">(
    task.priority || "medium"
  );
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: task.id,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 20,
      }
    : undefined;

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Ajouter un effet pour vérifier les props reçues
  useEffect(() => {
    console.log("TaskCard rendu avec task:", task.id, task.content);
  }, [task]);

  const handleSave = async () => {
    // Extract title and content from the merged content
    const title = content.split("\n")[0].trim();
    const taskContent = content.split("\n").slice(1).join("\n").trim();

    const updatedTaskData = {
      title,
      content: taskContent,
      priority,
    };

    if (onUpdateTask) {
      // Use optimistic update if handler provided
      onUpdateTask(task.id, updatedTaskData);
      setIsEditing(false);
      return;
    }

    // Fallback to original implementation
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedTaskData),
      });

      if (response.ok && onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error("Error updating task:", error);
    }

    setIsEditing(false);
  };

  const handleDeleteTask = async () => {
    if (onDeleteTask) {
      // Use optimistic update if handler provided
      onDeleteTask(task.id);
      return;
    }

    // Fallback to original implementation
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "DELETE",
      });

      if (response.ok && onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  const priorityColors = {
    low: "bg-blue-100 text-blue-800 hover:bg-blue-200",
    medium: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
    high: "bg-red-100 text-red-800 hover:bg-red-200",
  };

  const priorityLabels = {
    low: "Basse",
    medium: "Moyenne",
    high: "Haute",
  };

  const handlePriorityChange = (newPriority: "low" | "medium" | "high") => {
    setPriority(newPriority);
  };

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
            onClick={handleDeleteTask}
            className="text-gray-500 hover:text-red-600 p-1 rounded-md hover:bg-gray-100"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex items-start gap-2">
          <div
            className="mt-1 cursor-grab touch-none"
            {...attributes}
            {...listeners}
          >
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
                        priority === "low"
                          ? priorityColors.low
                          : "bg-gray-100 hover:bg-gray-200"
                      )}
                    >
                      Basse
                    </button>
                    <button
                      onClick={() => handlePriorityChange("medium")}
                      className={cn(
                        "text-xs px-2 py-1 rounded-md",
                        priority === "medium"
                          ? priorityColors.medium
                          : "bg-gray-100 hover:bg-gray-200"
                      )}
                    >
                      Moyenne
                    </button>
                    <button
                      onClick={() => handlePriorityChange("high")}
                      className={cn(
                        "text-xs px-2 py-1 rounded-md",
                        priority === "high"
                          ? priorityColors.high
                          : "bg-gray-100 hover:bg-gray-200"
                      )}
                    >
                      Haute
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
                    <Badge
                      variant="outline"
                      className={cn("text-xs", priorityColors[task.priority])}
                    >
                      {priorityLabels[task.priority]}
                    </Badge>
                  )}
                  <span className="text-xs text-gray-400">
                    {format(new Date(task.createdAt), "MMM d")}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
