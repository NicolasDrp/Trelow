"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Board {
  id: string;
  content: string;
  createdAt: string;
}

export default function OfflinePage() {
  const [cachedBoards, setCachedBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // If we're online, redirect to home page
    if (typeof window !== "undefined" && navigator.onLine) {
      router.push("/");
      return;
    }

    // Try to load cached boards
    const loadCachedBoards = async () => {
      try {
        setLoading(true);
        // First try localStorage
        const localBoards = localStorage.getItem("cached-boards");
        if (localBoards) {
          const parsedBoards = JSON.parse(localBoards);
          console.log("Boards loaded from localStorage:", parsedBoards);
          setCachedBoards(parsedBoards);
          setLoading(false);
          return;
        }

        // Then try the Cache API
        if ("caches" in window) {
          const cache = await caches.open("trelow-offline-v1");
          const cachedResponse = await cache.match("/api/boards");

          if (cachedResponse) {
            const data = await cachedResponse.json();
            console.log("Boards loaded from Cache API:", data);
            setCachedBoards(data);
            setLoading(false);
            return;
          }
        }

        // No cached boards found
        setCachedBoards([]);
        setLoading(false);
      } catch (error) {
        console.error("Error loading cached boards:", error);
        setCachedBoards([]);
        setLoading(false);
      }
    };

    loadCachedBoards();

    // Handle coming back online
    const handleOnline = () => {
      router.push("/");
    };

    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">
            Loading offline content...
          </h2>
          <p className="text-gray-500">
            Please wait while we check for available data.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-yellow-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                You are offline
              </h3>
              <p className="text-sm text-yellow-700 mt-1">
                You can still view your previously loaded boards, but you cannot
                make changes until you're back online.
              </p>
            </div>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Available Boards
        </h1>

        {cachedBoards.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cachedBoards.map((board) => (
              <Link href={`/board/${board.id}`} key={board.id}>
                <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow border border-gray-200">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg font-medium text-gray-900 truncate">
                      {board.content}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Created on{" "}
                      {new Date(board.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden rounded-lg">
            <div className="px-4 py-5 sm:p-6 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No boards available offline
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                You need to connect to the internet to view your boards.
              </p>
            </div>
          </div>
        )}

        <div className="mt-8 bg-white shadow overflow-hidden rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Offline Mode Information
            </h3>
            <div className="mt-2 max-w-xl text-sm text-gray-500">
              <p>
                In offline mode, you can view previously loaded boards and
                tasks, but you cannot make changes. Once you're back online,
                your app will automatically reconnect.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
