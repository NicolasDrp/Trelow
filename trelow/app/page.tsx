"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface Board {
  id: string;
  content: string;
  createdAt: string;
}

export default function BoardsListPage() {
  const { data: session, status } = useSession();
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newBoardTitle, setNewBoardTitle] = useState("");
  const router = useRouter();

  useEffect(() => {
    console.log("Session status:", status);
    console.log("Session data:", session);

    // Redirect to login if not authenticated
    if (status === "unauthenticated") {
      console.log("Redirection vers login car non authentifié");
      router.push("/login");
      return;
    }

    if (status === "authenticated") {
      console.log("Utilisateur authentifié, récupération des tableaux...");
      fetchBoards();
    }
  }, [status, router, session]);

  const fetchBoards = async () => {
    try {
      console.log("Appel API pour récupérer les tableaux");
      setLoading(true);
      setError(null);

      const response = await fetch("/api/boards");
      console.log("Réponse API reçue:", response.status);

      const data = await response.json();

      if (response.ok) {
        console.log("Tableaux récupérés:", data);
        setBoards(data);
      } else {
        console.error("Erreur API:", data.message);
        setError(
          "Erreur lors de la récupération des tableaux: " + data.message
        );
      }
    } catch (error) {
      console.error("Erreur fetch:", error);
      setError("Erreur de connexion au serveur");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newBoardTitle.trim()) return;

    try {
      const response = await fetch("/api/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newBoardTitle }),
      });

      if (response.ok) {
        const newBoard = await response.json();
        setBoards([...boards, newBoard]);
        setNewBoardTitle("");
      }
    } catch (error) {
      console.error("Erreur lors de la création du tableau:", error);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-xl">Vérification de l'authentification...</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-xl">Chargement des tableaux...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Mes tableaux Kanban</h1>
        <div>
          <span className="mr-2">
            Connecté en tant que {session?.user?.username}
          </span>
          <button
            onClick={() => router.push("/api/auth/signout")}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
          >
            Déconnexion
          </button>
        </div>
      </header>

      <div className="mb-8">
        <form onSubmit={handleCreateBoard} className="flex gap-2">
          <input
            type="text"
            placeholder="Nom du nouveau tableau"
            className="flex-grow px-4 py-2 border rounded"
            value={newBoardTitle}
            onChange={(e) => setNewBoardTitle(e.target.value)}
          />
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          >
            Créer
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {boards.length > 0 ? (
          boards.map((board) => (
            <Link href={`/board/${board.id}`} key={board.id}>
              <div className="border p-6 rounded-lg hover:shadow-md transition-shadow cursor-pointer">
                <h2 className="text-xl font-semibold mb-2">{board.content}</h2>
                <p className="text-gray-500 text-sm">
                  Créé le {new Date(board.createdAt).toLocaleDateString()}
                </p>
              </div>
            </Link>
          ))
        ) : (
          <div className="col-span-full text-center p-10 border rounded-lg">
            <p>
              Vous n'avez pas encore de tableaux. Créez-en un pour commencer!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
