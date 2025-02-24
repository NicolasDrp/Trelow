"use client";

import KanbanBoard from "@/components/KanbanBoard";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-8">
      <h1 className="text-4xl font-bold text-center mb-8 text-gray-800">
        Trelow Board
      </h1>
      <KanbanBoard />
    </div>
  );
}
