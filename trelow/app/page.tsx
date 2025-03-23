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
  const [isOffline, setIsOffline] = useState(false);
  const router = useRouter();

  // Vérifier l'état de la connexion
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Définir l'état initial
      setIsOffline(!navigator.onLine);

      // Ajouter les écouteurs d'événements
      const handleOnline = () => setIsOffline(false);
      const handleOffline = () => setIsOffline(true);

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, []);

  useEffect(() => {
    console.log("Session status:", status);
    console.log("Session data:", session);
    console.log("État de connexion:", isOffline ? "Hors ligne" : "En ligne");

    // Redirect to login if not authenticated when online
    if (status === "unauthenticated" && !isOffline) {
      console.log("Redirection vers login car non authentifié");
      router.push("/login");
      return;
    }

    if (status === "authenticated") {
      console.log("Utilisateur authentifié, récupération des tableaux...");
      fetchBoards();
    } else if (isOffline) {
      // En mode hors ligne, essayer de charger depuis le cache
      console.log(
        "Mode hors ligne, récupération des tableaux depuis le cache..."
      );
      fetchBoardsFromCache();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, router, session, isOffline]);

  // Précharger tous les tableaux en arrière-plan
  useEffect(() => {
    if (boards.length > 0 && !isOffline && status === "authenticated") {
      console.log(
        "Préchargement de tous les tableaux pour utilisation hors ligne..."
      );

      // Stocker les tableaux dans localStorage (une seule fois)
      const cachedBoards = localStorage.getItem("cached-boards");
      const cachedBoardsData = cachedBoards ? JSON.parse(cachedBoards) : [];

      // Vérifier si nous avons de nouveaux tableaux à mettre en cache
      const hasNewBoards = boards.some(
        (board) => !cachedBoardsData.find((cached) => cached.id === board.id)
      );

      if (hasNewBoards || cachedBoardsData.length !== boards.length) {
        localStorage.setItem("cached-boards", JSON.stringify(boards));
        console.log("Tableaux mis à jour dans localStorage");

        // Demander au service worker de mettre en cache tous les tableaux
        if (
          "serviceWorker" in navigator &&
          navigator.serviceWorker.controller
        ) {
          navigator.serviceWorker.controller.postMessage({
            type: "CACHE_ALL_BOARDS",
          });
        }
      } else {
        console.log("Tableaux déjà en cache, pas de mise à jour nécessaire");
      }
    }
  }, [boards, isOffline, status]);

  const fetchBoardsFromCache = async () => {
    try {
      console.log("Tentative de récupération des tableaux depuis le cache");

      // D'abord essayer localStorage
      const cachedBoards = localStorage.getItem("cached-boards");
      if (cachedBoards) {
        const parsedBoards = JSON.parse(cachedBoards);
        console.log("Tableaux récupérés depuis localStorage:", parsedBoards);
        setBoards(parsedBoards);
        setLoading(false);
        return;
      }

      // Ensuite essayer le Cache API
      if ("caches" in window) {
        const cache = await caches.open("trelow-offline-v1");
        const cachedResponse = await cache.match("/api/boards");

        if (cachedResponse) {
          const data = await cachedResponse.json();
          console.log("Tableaux récupérés depuis Cache API:", data);
          setBoards(data);
          // Sauvegarder aussi dans localStorage
          localStorage.setItem("cached-boards", JSON.stringify(data));
          setLoading(false);
          return;
        }
      }

      console.log("Aucun tableau trouvé dans le cache");
      setBoards([]);
      setError("Aucun tableau disponible en mode hors ligne");
    } catch (error) {
      console.error(
        "Erreur lors de la récupération des tableaux en cache:",
        error
      );
      setError("Erreur lors de la récupération des tableaux en cache");
    } finally {
      setLoading(false);
    }
  };

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

        // Sauvegarder immédiatement dans localStorage
        localStorage.setItem("cached-boards", JSON.stringify(data));
      } else {
        console.error("Erreur API:", data.message);
        setError(
          "Erreur lors de la récupération des tableaux: " + data.message
        );

        // En cas d'erreur, essayer le cache
        fetchBoardsFromCache();
      }
    } catch (error) {
      console.error("Erreur fetch:", error);
      setError("Erreur de connexion au serveur");

      // En cas d'erreur réseau, essayer le cache
      fetchBoardsFromCache();
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

        // Mettre à jour l'état et le cache
        const updatedBoards = [...boards, newBoard];
        setBoards(updatedBoards);

        // Mettre à jour les données hors ligne
        localStorage.setItem("cached-boards", JSON.stringify(updatedBoards));

        // Mettre à jour le cache via le service worker
        if (
          "serviceWorker" in navigator &&
          navigator.serviceWorker.controller
        ) {
          navigator.serviceWorker.controller.postMessage({
            type: "CACHE_BOARD_DATA",
            boardId: newBoard.id,
            data: newBoard,
            action: "add",
          });

          // Demander au service worker de mettre en cache ce nouveau tableau
          navigator.serviceWorker.controller.postMessage({
            type: "CACHE_BOARD",
            boardId: newBoard.id,
          });
        }

        setNewBoardTitle("");
      }
    } catch (error) {
      console.error("Erreur lors de la création du tableau:", error);
    }
  };

  if (status === "loading" && !isOffline) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-xl">Vérification de l&apos;authentification...</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-xl">
          {isOffline
            ? "Récupération des tableaux en cache..."
            : "Chargement des tableaux..."}
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Mes tableaux Kanban</h1>
        {isOffline ? (
          <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-md flex items-center">
            <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
            Mode hors ligne
          </div>
        ) : (
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
        )}
      </header>

      {!isOffline && (
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
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md mb-4">
          {error}
        </div>
      )}

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
              {isOffline
                ? "Aucun tableau disponible en mode hors ligne"
                : "Vous n'avez pas encore de tableaux. Créez-en un pour commencer!"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
