import { create } from "zustand";
import { Column, Id, Task } from "@/types";

interface BoardState {
  columns: Column[];
  tasks: Task[];
  addColumn: (title: string) => void;
  addTask: (columnId: Id, content: string) => void;
  deleteTask: (id: Id) => void;
  updateTask: (id: Id, content: string) => void;
  moveTask: (taskId: Id, targetColumnId: Id) => void;
}

export const useBoardStore = create<BoardState>((set) => ({
  columns: [
    { id: 1, title: "À faire" },
    { id: 2, title: "En cours" },
    { id: 3, title: "Terminé" },
  ],
  tasks: [],

  addColumn: (title) =>
    set((state) => ({
      columns: [...state.columns, { id: Date.now(), title }],
    })),

  addTask: (columnId, content) =>
    set((state) => ({
      tasks: [...state.tasks, { id: Date.now(), columnId, content }],
    })),

  deleteTask: (id) =>
    set((state) => ({
      tasks: state.tasks.filter((task) => task.id !== id),
    })),

  updateTask: (id, content) =>
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === id ? { ...task, content } : task
      ),
    })),

  moveTask: (taskId, targetColumnId) =>
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === taskId ? { ...task, columnId: targetColumnId } : task
      ),
    })),
}));
