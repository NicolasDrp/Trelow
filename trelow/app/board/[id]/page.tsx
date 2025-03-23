"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import Column from "@/components/Column";
import TaskCard from "@/components/TaskCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";

interface Task {
  id: string;
  title: string;
  content: string | null;
  columnId: string;
  priority: "low" | "medium" | "high";
  createdAt: string;
  userId: string | null;
}

interface Column {
  id: string;
  title: string;
  tasks: Task[];
}

interface Board {
  id: string;
  content: string;
  columns: Column[];
}

export default function BoardPage() {
  const params = useParams();
  const { data: session, status } = useSession();
  const router = useRouter();
  const boardId = params.id as string;

  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState("");
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // Configure sensors for better touch/pointer handling
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated" && boardId) {
      fetchBoard();
    }
  }, [status, boardId, router]);

  const fetchBoard = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/boards/${boardId}`);
      const data = await response.json();

      if (response.ok) {
        setBoard(data);
      } else {
        console.error("Error fetching board:", data.message);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fonction utilitaire pour mettre à jour le cache hors ligne
  const updateOfflineCache = async (
    type: "board" | "column" | "task",
    action: "add" | "update" | "delete",
    data: any,
    columnId?: string
  ) => {
    try {
      // 1. Mettre à jour localStorage pour un accès rapide
      if (type === "board" && board) {
        // Mettre à jour les informations du tableau
        localStorage.setItem(`cached-board-${boardId}`, JSON.stringify(board));
      } else if (type === "column") {
        // Mettre à jour les colonnes
        if (board) {
          const columnsData = board.columns;
          localStorage.setItem(
            `cached-board-${boardId}-columns`,
            JSON.stringify(columnsData)
          );
        }
      } else if (type === "task" && columnId) {
        // Trouver les tâches de la colonne spécifique
        const column = board?.columns.find((col) => col.id === columnId);
        if (column) {
          localStorage.setItem(
            `cached-column-${columnId}-tasks`,
            JSON.stringify(column.tasks)
          );
        }
      }

      // 2. Mettre à jour le cache via le service worker
      if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: "UPDATE_CACHE",
          boardId,
          entityType: type,
          action: action,
          data: data,
          columnId: columnId,
        });
      }
    } catch (error) {
      console.error(
        "Erreur lors de la mise à jour du cache hors ligne:",
        error
      );
    }
  };

  // Mettre à jour handleAddColumn pour sauvegarder hors ligne
  const handleAddColumn = async () => {
    if (!newColumnTitle.trim() || !board) return;

    // Create temporary column with a temporary ID
    const tempId = `temp_${Date.now()}`;
    const newColumn: Column = {
      id: tempId,
      title: newColumnTitle,
      tasks: [],
    };

    // Update UI optimistically
    const updatedBoard = {
      ...board,
      columns: [...board.columns, newColumn],
    };

    setBoard(updatedBoard);
    setNewColumnTitle("");
    setIsAddingColumn(false);

    try {
      const response = await fetch(`/api/boards/${boardId}/columns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newColumnTitle }),
      });

      if (response.ok) {
        // Get the actual column with real ID from response
        const createdColumn = await response.json();

        // Replace temp column with real one
        const finalBoard = {
          ...board,
          columns: board.columns.map((col) =>
            col.id === tempId ? { ...createdColumn, tasks: [] } : col
          ),
        };

        setBoard(finalBoard);

        // Mettre à jour le cache hors ligne
        updateOfflineCache("column", "add", createdColumn);
      } else {
        // If API call failed, revert to original state
        fetchBoard();
      }
    } catch (error) {
      console.error("Error adding column:", error);
      fetchBoard(); // Refresh on error
    }
  };

  // Mettre à jour handleUpdateColumnTitle
  const handleUpdateColumnTitle = async (
    columnId: string,
    newTitle: string
  ) => {
    if (!board) return;

    // Backup de la colonne avant modification
    const originalColumn = board.columns.find((col) => col.id === columnId);
    if (!originalColumn) return;

    // Update UI optimistically
    const updatedColumns = board.columns.map((col) =>
      col.id === columnId ? { ...col, title: newTitle } : col
    );

    const updatedBoard = {
      ...board,
      columns: updatedColumns,
    };

    setBoard(updatedBoard);

    try {
      const response = await fetch(`/api/columns/${columnId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });

      if (response.ok) {
        // Mettre à jour le cache hors ligne
        const updatedColumn = { ...originalColumn, title: newTitle };
        updateOfflineCache("column", "update", updatedColumn);
      } else {
        fetchBoard(); // Revert on error
      }
    } catch (error) {
      console.error("Error updating column:", error);
      fetchBoard();
    }
  };

  // Mettre à jour handleDeleteColumn
  const handleDeleteColumn = async (columnId: string) => {
    if (!board) return;

    // Save column for possible restoration
    const deletedColumn = board.columns.find((col) => col.id === columnId);
    if (!deletedColumn) return;

    // Update UI optimistically
    const updatedColumns = board.columns.filter((col) => col.id !== columnId);
    const updatedBoard = {
      ...board,
      columns: updatedColumns,
    };

    setBoard(updatedBoard);

    try {
      const response = await fetch(`/api/columns/${columnId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Mettre à jour le cache hors ligne
        updateOfflineCache("column", "delete", deletedColumn);

        // Supprimer aussi les tâches de cette colonne du cache
        localStorage.removeItem(`cached-column-${columnId}-tasks`);
      } else {
        fetchBoard(); // Revert on error
      }
    } catch (error) {
      console.error("Error deleting column:", error);
      fetchBoard();
    }
  };

  // Mettre à jour handleAddTask
  const handleAddTask = async (
    columnId: string,
    taskData: { title: string; priority: "low" | "medium" | "high" }
  ) => {
    if (!board) return;

    // Create temporary task
    const tempTask: Task = {
      id: `temp_${Date.now()}`,
      title: taskData.title,
      content: null,
      columnId: columnId,
      priority: taskData.priority,
      createdAt: new Date().toISOString(),
      userId: session?.user?.id || null,
    };

    // Update UI optimistically
    const updatedColumns = board.columns.map((col) => {
      if (col.id === columnId) {
        return {
          ...col,
          tasks: [tempTask, ...col.tasks],
        };
      }
      return col;
    });

    const updatedBoard = {
      ...board,
      columns: updatedColumns,
    };

    setBoard(updatedBoard);

    try {
      const response = await fetch(`/api/columns/${columnId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskData),
      });

      if (response.ok) {
        const realTask = await response.json();

        // Replace temp task with real one
        const finalColumns = board.columns.map((col) => {
          if (col.id === columnId) {
            return {
              ...col,
              tasks: col.tasks.map((task) =>
                task.id === tempTask.id ? realTask : task
              ),
            };
          }
          return col;
        });

        const finalBoard = {
          ...board,
          columns: finalColumns,
        };

        setBoard(finalBoard);

        // Mettre à jour le cache hors ligne
        updateOfflineCache("task", "add", realTask, columnId);
      } else {
        fetchBoard(); // Revert on error
      }
    } catch (error) {
      console.error("Error adding task:", error);
      fetchBoard();
    }
  };

  // Mettre à jour handleUpdateTask
  const handleUpdateTask = async (
    taskId: string,
    updatedData: {
      title: string;
      content?: string;
      priority: "low" | "medium" | "high";
    }
  ) => {
    if (!board) return;

    // Find task and its column
    let taskColumn: Column | undefined;
    let taskToUpdate: Task | undefined;

    board.columns.forEach((col) => {
      const task = col.tasks.find((t) => t.id === taskId);
      if (task) {
        taskColumn = col;
        taskToUpdate = task;
      }
    });

    if (!taskColumn || !taskToUpdate) return;

    // Update UI optimistically
    const updatedColumns = board.columns.map((col) => {
      if (col.id === taskColumn?.id) {
        return {
          ...col,
          tasks: col.tasks.map((task) => {
            if (task.id === taskId) {
              return {
                ...task,
                title: updatedData.title,
                content: updatedData.content || task.content,
                priority: updatedData.priority,
              };
            }
            return task;
          }),
        };
      }
      return col;
    });

    const updatedBoard = {
      ...board,
      columns: updatedColumns,
    };

    setBoard(updatedBoard);

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedData),
      });

      if (response.ok) {
        // Récupérer la tâche mise à jour
        const updatedTask = {
          ...taskToUpdate,
          title: updatedData.title,
          content: updatedData.content || taskToUpdate.content,
          priority: updatedData.priority,
        };

        // Mettre à jour le cache hors ligne
        updateOfflineCache("task", "update", updatedTask, taskColumn.id);
      } else {
        fetchBoard(); // Revert on error
      }
    } catch (error) {
      console.error("Error updating task:", error);
      fetchBoard();
    }
  };

  // Mettre à jour handleDeleteTask
  const handleDeleteTask = async (taskId: string) => {
    if (!board) return;

    // Find which column contains the task
    let columnWithTask: Column | undefined;
    let taskToDelete: Task | undefined;

    board.columns.forEach((col) => {
      const task = col.tasks.find((t) => t.id === taskId);
      if (task) {
        columnWithTask = col;
        taskToDelete = task;
      }
    });

    if (!columnWithTask || !taskToDelete) return;

    // Update UI optimistically
    const updatedColumns = board.columns.map((col) => {
      if (col.id === columnWithTask?.id) {
        return {
          ...col,
          tasks: col.tasks.filter((task) => task.id !== taskId),
        };
      }
      return col;
    });

    const updatedBoard = {
      ...board,
      columns: updatedColumns,
    };

    setBoard(updatedBoard);

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Mettre à jour le cache hors ligne
        updateOfflineCache("task", "delete", taskToDelete, columnWithTask.id);
      } else {
        fetchBoard(); // Revert on error
      }
    } catch (error) {
      console.error("Error deleting task:", error);
      fetchBoard();
    }
  };

  // Add this function before handleDragEnd
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeTaskId = active.id.toString();

    if (!board) return;

    // Find the task from all columns
    let foundTask: Task | null = null;
    board.columns.forEach((column) => {
      const task = column.tasks.find((t) => t.id === activeTaskId);
      if (task) foundTask = task;
    });

    if (foundTask) setActiveTask(foundTask);
  };

  // Mettre à jour handleDragEnd
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over || !board) return;

    const taskId = active.id.toString();
    const targetColumnId = over.id.toString();

    // Find current column of the task
    let sourceColumnId = "";
    let taskToMove: Task | null = null;

    board.columns.forEach((column) => {
      const task = column.tasks.find((t) => t.id === taskId);
      if (task) {
        sourceColumnId = column.id;
        taskToMove = task;
      }
    });

    if (taskToMove && sourceColumnId !== targetColumnId) {
      // Backup des colonnes source et cible avant modification
      const sourceColumn = board.columns.find(
        (col) => col.id === sourceColumnId
      );
      const targetColumn = board.columns.find(
        (col) => col.id === targetColumnId
      );

      if (!sourceColumn || !targetColumn) return;

      // Update UI optimistically
      const updatedColumns = board.columns.map((col) => {
        if (col.id === sourceColumnId) {
          return {
            ...col,
            tasks: col.tasks.filter((t) => t.id !== taskId),
          };
        }
        if (col.id === targetColumnId) {
          const movedTask = { ...taskToMove!, columnId: targetColumnId };
          return {
            ...col,
            tasks: [movedTask, ...col.tasks],
          };
        }
        return col;
      });

      const updatedBoard = {
        ...board,
        columns: updatedColumns,
      };

      setBoard(updatedBoard);

      try {
        const response = await fetch(`/api/tasks/${taskId}/move`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ destinationColumnId: targetColumnId }),
        });

        if (response.ok) {
          // Mettre à jour le cache hors ligne pour les deux colonnes
          const updatedSourceColumn = updatedColumns.find(
            (col) => col.id === sourceColumnId
          );
          const updatedTargetColumn = updatedColumns.find(
            (col) => col.id === targetColumnId
          );

          if (updatedSourceColumn) {
            updateOfflineCache("column", "update", updatedSourceColumn);
          }

          if (updatedTargetColumn) {
            updateOfflineCache("column", "update", updatedTargetColumn);
          }

          // Mettre à jour la tâche elle-même
          const movedTask = { ...taskToMove, columnId: targetColumnId };
          updateOfflineCache("task", "update", movedTask, targetColumnId);
        } else {
          fetchBoard(); // Revert on error
        }
      } catch (error) {
        console.error("Error moving task:", error);
        fetchBoard();
      }
    }
  };

  // Fix loading state rendering
  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex justify-center items-center">
        <p className="text-xl">Loading your board...</p>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex justify-center items-center">
        <p className="text-xl">Board not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold text-gray-800">{board.content}</h1>
          {navigator.onLine === false && (
            <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-md flex items-center">
              <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
              Mode hors ligne
            </div>
          )}
        </div>
        <Button
          variant="outline"
          className="text-gray-600"
          onClick={() => router.push("/")}
        >
          Back to Boards
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-x-auto p-4 bg-gray-100 min-h-[calc(100vh-12rem)] rounded-lg">
            <div className="flex gap-4 h-full">
              {board.columns.map((column) => (
                <Column
                  key={column.id}
                  column={{
                    id: column.id,
                    title: column.title,
                    color:
                      column.id === "1"
                        ? "#3498db"
                        : column.id === "2"
                        ? "#f39c12"
                        : "#2ecc71",
                  }}
                  tasks={column.tasks.map((task) => ({
                    id: task.id,
                    content:
                      task.title + (task.content ? `\n${task.content}` : ""),
                    columnId: task.columnId,
                    priority: task.priority,
                    createdAt: new Date(task.createdAt),
                  }))}
                  boardId={boardId}
                  onBoardUpdate={fetchBoard}
                  onUpdateColumn={handleUpdateColumnTitle}
                  onDeleteColumn={handleDeleteColumn}
                  onAddTask={handleAddTask}
                  onUpdateTask={handleUpdateTask}
                  onDeleteTask={handleDeleteTask}
                />
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
                      if (e.key === "Enter") handleAddColumn();
                      if (e.key === "Escape") setIsAddingColumn(false);
                    }}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsAddingColumn(false)}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleAddColumn}
                      disabled={!newColumnTitle.trim()}
                    >
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

        <DragOverlay>
          {activeTask && (
            <TaskCard
              task={{
                id: activeTask.id,
                content:
                  activeTask.title +
                  (activeTask.content ? `\n${activeTask.content}` : ""),
                columnId: activeTask.columnId,
                priority: activeTask.priority,
                createdAt: new Date(activeTask.createdAt),
              }}
            />
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
