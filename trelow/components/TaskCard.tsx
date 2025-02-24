import { Task } from "@/types";
import { useDraggable } from "@dnd-kit/core";
import { useBoardStore } from "@/store/boardStore";
import { Card } from "./ui/card";
import { X } from "lucide-react";

interface Props {
  task: Task;
}

export default function TaskCard({ task }: Props) {
  const { deleteTask } = useBoardStore();
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: task.id,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="p-3 bg-white cursor-grab relative group"
    >
      <button
        onClick={() => deleteTask(task.id)}
        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X className="h-4 w-4" />
      </button>
      <p>{task.content}</p>
    </Card>
  );
}
