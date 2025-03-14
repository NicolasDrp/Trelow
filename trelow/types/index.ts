export interface Task {
  id: string
  content: string
  columnId: string
  priority?: "low" | "medium" | "high"
  createdAt: Date
}

export interface Column {
  id: string
  title: string
  color?: string
}

