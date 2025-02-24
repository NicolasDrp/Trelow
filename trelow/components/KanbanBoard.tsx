"use client";

import { DndContext, DragEndEvent } from "@dnd-kit/core";
import { useBoardStore } from "@/store/boardStore";
import Column from "./Column";

export default function KanbanBoard() {
  const { columns, tasks, moveTask } = useBoardStore();

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id;
    const targetColumnId = over.id;

    moveTask(taskId, targetColumnId);
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto p-4 bg-gray-300">
        {columns.map((column) => (
          <Column
            key={column.id}
            column={column}
            tasks={tasks.filter((task) => task.columnId === column.id)}
          />
        ))}
      </div>
    </DndContext>
  );
}
