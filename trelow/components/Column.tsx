import { Column as ColumnType, Task } from "@/types";
import TaskCard from "./TaskCard";
import { useDroppable } from "@dnd-kit/core";
import { useBoardStore } from "@/store/boardStore";
import { Button } from "./ui/button";
import { Plus } from "lucide-react";

interface Props {
  column: ColumnType;
  tasks: Task[];
}

export default function Column({ column, tasks }: Props) {
  const { addTask } = useBoardStore();
  const { setNodeRef } = useDroppable({
    id: column.id,
  });

  return (
    <div
      ref={setNodeRef}
      className="w-80 bg-gray-500 rounded-lg p-4 flex flex-col gap-4"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">{column.title}</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => addTask(column.id, "Nouvelle tâche")}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex flex-col gap-2">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
}
