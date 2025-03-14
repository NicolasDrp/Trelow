import { create } from "zustand"
import { persist } from "zustand/middleware"
import { v4 as uuidv4 } from "uuid"
import type { Column, Task } from "@/types"

interface BoardState {
    columns: Column[]
    tasks: Task[]
    addColumn: (title: string) => void
    deleteColumn: (id: string) => void
    updateColumnTitle: (id: string, title: string) => void
    addTask: (columnId: string, content: string) => void
    updateTask: (id: string, content: string, priority?: "low" | "medium" | "high") => void
    deleteTask: (id: string) => void
    moveTask: (taskId: string | number, targetColumnId: string | number) => void
}

// Default columns
const defaultColumns: Column[] = [
    { id: "1", title: "To Do", color: "#3498db" },
    { id: "2", title: "In Progress", color: "#f39c12" },
    { id: "3", title: "Done", color: "#2ecc71" },
]

export const useBoardStore = create<BoardState>()(
    persist(
        (set) => ({
            columns: defaultColumns,
            tasks: [],

            addColumn: (title) =>
                set((state) => ({
                    columns: [...state.columns, { id: uuidv4(), title }],
                })),

            deleteColumn: (id) =>
                set((state) => ({
                    columns: state.columns.filter((col) => col.id !== id),
                    tasks: state.tasks.filter((task) => task.columnId !== id),
                })),

            updateColumnTitle: (id, title) =>
                set((state) => ({
                    columns: state.columns.map((col) => (col.id === id ? { ...col, title } : col)),
                })),

            addTask: (columnId, content) =>
                set((state) => ({
                    tasks: [
                        ...state.tasks,
                        {
                            id: uuidv4(),
                            content,
                            columnId,
                            createdAt: new Date(),
                        },
                    ],
                })),

            updateTask: (id, content, priority) =>
                set((state) => ({
                    tasks: state.tasks.map((task) =>
                        task.id === id ? { ...task, content, priority: priority || task.priority } : task,
                    ),
                })),

            deleteTask: (id) =>
                set((state) => ({
                    tasks: state.tasks.filter((task) => task.id !== id),
                })),

            moveTask: (taskId, targetColumnId) =>
                set((state) => ({
                    tasks: state.tasks.map((task) =>
                        task.id === taskId ? { ...task, columnId: targetColumnId.toString() } : task,
                    ),
                })),
        }),
        {
            name: "kanban-board",
        },
    ),
)

