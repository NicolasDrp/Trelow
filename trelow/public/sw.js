const CACHE_NAME = "trelow-offline-v1";
const OFFLINE_URL = "/offline";

// Liste des ressources à mettre en cache
const ASSETS_TO_CACHE = [
  "/",
  "/offline",
  "/manifest.json",
  "/icon-192x192.png",
  "/favicon.ico",
];

// Installation du service worker et mise en cache des ressources essentielles
self.addEventListener("install", (event) => {
  console.log("[Service Worker] Installation");
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log("[Service Worker] Mise en cache des ressources essentielles");
      await cache.addAll(ASSETS_TO_CACHE);
      return self.skipWaiting();
    })
  );
});

// Activation et nettoyage des anciens caches
self.addEventListener("activate", (event) => {
  console.log("[Service Worker] Activation");
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => {
              console.log(
                `[Service Worker] Suppression de l'ancien cache: ${cacheName}`
              );
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log("[Service Worker] Revendique les clients");
        return self.clients.claim();
      })
  );
});

// Fonction pour mettre en cache un tableau complet et toutes ses données
async function cacheFullBoardData(boardId) {
  try {
    console.log(`[Service Worker] Préchargement du tableau ${boardId}`);
    const cache = await caches.open(CACHE_NAME);

    // Récupérer les données du tableau
    const boardUrl = `/api/boards/${boardId}`;
    const boardResponse = await fetch(boardUrl);
    if (!boardResponse.ok)
      throw new Error(`Échec récupération tableau ${boardId}`);
    await cache.put(boardUrl, boardResponse.clone());

    // Récupérer les colonnes du tableau
    const columnsUrl = `/api/boards/${boardId}/columns`;
    const columnsResponse = await fetch(columnsUrl);
    if (!columnsResponse.ok)
      throw new Error(`Échec récupération colonnes pour ${boardId}`);
    await cache.put(columnsUrl, columnsResponse.clone());

    // Récupérer les colonnes pour pouvoir ensuite récupérer les tâches
    const columnsData = await columnsResponse.clone().json();

    // Pour chaque colonne, récupérer et mettre en cache ses tâches
    if (Array.isArray(columnsData)) {
      for (const column of columnsData) {
        const tasksUrl = `/api/boards/${boardId}/columns/${column.id}/tasks`;
        const tasksResponse = await fetch(tasksUrl);
        if (tasksResponse.ok) {
          await cache.put(tasksUrl, tasksResponse.clone());
        }
      }
    }

    console.log(
      `[Service Worker] Tableau ${boardId} et ses données mis en cache avec succès`
    );
    return true;
  } catch (error) {
    console.error(
      `[Service Worker] Erreur lors du préchargement du tableau ${boardId}:`,
      error
    );
    return false;
  }
}

// Fonction pour précharger tous les tableaux d'un utilisateur
async function cacheAllUserBoards() {
  try {
    console.log("[Service Worker] Préchargement de tous les tableaux");
    const cache = await caches.open(CACHE_NAME);

    // Récupérer la liste des tableaux
    const boardsResponse = await fetch("/api/boards");
    if (!boardsResponse.ok)
      throw new Error("Échec récupération liste des tableaux");

    // Mettre en cache la liste des tableaux
    await cache.put("/api/boards", boardsResponse.clone());

    // Récupérer les données pour chaque tableau en parallèle pour être plus rapide
    const boards = await boardsResponse.clone().json();
    if (Array.isArray(boards)) {
      console.log(
        `[Service Worker] ${boards.length} tableaux trouvés, début du préchargement`
      );

      // Traiter les tableaux par lots de 3 pour éviter trop de requêtes simultanées
      const batchSize = 3;
      for (let i = 0; i < boards.length; i += batchSize) {
        const batch = boards.slice(i, i + batchSize);
        await Promise.all(batch.map((board) => cacheFullBoardData(board.id)));
        console.log(
          `[Service Worker] Lot ${i / batchSize + 1} de tableaux mis en cache`
        );
      }

      console.log(
        "[Service Worker] Tous les tableaux ont été préchargés avec succès"
      );
    }

    return true;
  } catch (error) {
    console.error(
      "[Service Worker] Erreur lors du préchargement des tableaux:",
      error
    );
    return false;
  }
}

// Gérer les messages envoyés au service worker
self.addEventListener("message", (event) => {
  console.log("[Service Worker] Message reçu:", event.data);

  if (event.data && event.data.type === "CACHE_ALL_BOARDS") {
    cacheAllUserBoards();
  } else if (event.data && event.data.type === "CACHE_BOARD") {
    const boardId = event.data.boardId;
    if (boardId) {
      cacheFullBoardData(boardId);
    }
  } else if (event.data && event.data.type === "UPDATE_CACHE") {
    // Nouveau gestionnaire pour la mise à jour du cache
    handleCacheUpdate(event.data);
  } else if (event.data && event.data.type === "CACHE_BOARD_DATA") {
    // Gestionnaire pour la mise en cache directe des données d'un tableau
    cacheBoardData(event.data);
  }
});

// Fonction pour mettre à jour le cache suite à des modifications
async function handleCacheUpdate(updateData) {
  try {
    const { boardId, entityType, action, data, columnId } = updateData;
    const cache = await caches.open(CACHE_NAME);

    console.log(
      `[Service Worker] Mise à jour du cache: ${action} ${entityType}`
    );

    // Construction des URLs et récupération des données existantes
    if (entityType === "board") {
      const url = `/api/boards/${boardId}`;

      if (action === "update") {
        // Mettre à jour les données du tableau dans le cache
        const existingResponse = await cache.match(url);
        if (existingResponse) {
          // Créer une nouvelle réponse avec les données mises à jour
          const newResponse = new Response(JSON.stringify(data), {
            headers: existingResponse.headers,
            status: existingResponse.status,
            statusText: existingResponse.statusText,
          });
          await cache.put(url, newResponse);
        }
      } else if (action === "delete") {
        // Supprimer le tableau du cache
        await cache.delete(url);
        // Supprimer aussi les colonnes et tâches associées
        const allRequests = await cache.keys();
        const relatedRequests = allRequests.filter(
          (req) =>
            req.url.includes(`/api/boards/${boardId}/`) ||
            (req.url.includes(`/api/columns/`) &&
              data.columns.some((col) => req.url.includes(col.id)))
        );
        await Promise.all(relatedRequests.map((req) => cache.delete(req)));
      }
    } else if (entityType === "column") {
      // URL pour la liste de colonnes
      const columnsUrl = `/api/boards/${boardId}/columns`;

      if (action === "add" || action === "update" || action === "delete") {
        // Récupérer la liste actuelle des colonnes
        const columnsResponse = await cache.match(columnsUrl);
        if (columnsResponse) {
          const columns = await columnsResponse.json();
          let updatedColumns = [...columns];

          if (action === "add") {
            updatedColumns.push(data);
          } else if (action === "update") {
            updatedColumns = updatedColumns.map((col) =>
              col.id === data.id ? data : col
            );
          } else if (action === "delete") {
            updatedColumns = updatedColumns.filter((col) => col.id !== data.id);
          }

          // Mettre à jour le cache avec la nouvelle liste
          const newResponse = new Response(JSON.stringify(updatedColumns), {
            headers: columnsResponse.headers,
            status: columnsResponse.status,
            statusText: columnsResponse.statusText,
          });
          await cache.put(columnsUrl, newResponse);
        }
      }
    } else if (entityType === "task" && columnId) {
      // URL pour les tâches d'une colonne
      const tasksUrl = `/api/boards/${boardId}/columns/${columnId}/tasks`;

      // Récupérer les tâches actuelles de la colonne
      const tasksResponse = await cache.match(tasksUrl);
      if (tasksResponse) {
        const tasks = await tasksResponse.json();
        let updatedTasks = [...tasks];

        if (action === "add") {
          updatedTasks.push(data);
        } else if (action === "update") {
          updatedTasks = updatedTasks.map((task) =>
            task.id === data.id ? data : task
          );
        } else if (action === "delete") {
          updatedTasks = updatedTasks.filter((task) => task.id !== data.id);
        }

        // Mettre à jour le cache avec les nouvelles tâches
        const newResponse = new Response(JSON.stringify(updatedTasks), {
          headers: tasksResponse.headers,
          status: tasksResponse.status,
          statusText: tasksResponse.statusText,
        });
        await cache.put(tasksUrl, newResponse);
      }
    }

    console.log(`[Service Worker] Mise à jour du cache terminée`);
  } catch (error) {
    console.error(
      "[Service Worker] Erreur lors de la mise à jour du cache:",
      error
    );
  }
}

// Fonction pour mettre en cache directement les données d'un tableau
async function cacheBoardData(cacheData) {
  try {
    const { boardId, data, action } = cacheData;
    const cache = await caches.open(CACHE_NAME);

    // Mise en cache pour les tableaux
    if (action === "add") {
      // Mettre à jour la liste des tableaux
      const boardsUrl = "/api/boards";
      const boardsResponse = await cache.match(boardsUrl);

      if (boardsResponse) {
        const boards = await boardsResponse.json();
        const updatedBoards = [...boards, data];

        // Mettre à jour le cache avec la nouvelle liste
        const newResponse = new Response(JSON.stringify(updatedBoards), {
          headers: boardsResponse.headers,
          status: boardsResponse.status,
          statusText: boardsResponse.statusText,
        });
        await cache.put(boardsUrl, newResponse);
      }

      // Mettre en cache le nouveau tableau lui-même
      const boardUrl = `/api/boards/${boardId}`;
      const response = new Response(JSON.stringify(data), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
      await cache.put(boardUrl, response);
    }

    console.log(
      `[Service Worker] Données du tableau ${boardId} mises en cache`
    );
  } catch (error) {
    console.error(
      "[Service Worker] Erreur lors de la mise en cache des données du tableau:",
      error
    );
  }
}

// Stratégie de mise en cache pour les requêtes
self.addEventListener("fetch", (event) => {
  // Ignorer les requêtes non GET
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Ne pas intercepter les requêtes pour d'autres domaines
  if (url.origin !== self.location.origin) return;

  // Stratégie pour les API
  if (url.pathname.startsWith("/api/")) {
    handleApiRequest(event);
    return;
  }

  // Stratégie pour les pages HTML et autres ressources
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Retourner la ressource du cache si elle existe
      if (cachedResponse) {
        return cachedResponse;
      }

      // Sinon faire une requête réseau
      return fetch(event.request)
        .then((response) => {
          // Vérifier si la réponse est valide
          if (
            !response ||
            response.status !== 200 ||
            response.type !== "basic"
          ) {
            return response;
          }

          // Mettre en cache la nouvelle ressource
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        })
        .catch(() => {
          // En cas d'erreur réseau, afficher la page hors ligne
          if (event.request.headers.get("accept").includes("text/html")) {
            return caches.match(OFFLINE_URL);
          }

          return new Response("Ressource non disponible hors ligne", {
            status: 404,
            headers: { "Content-Type": "text/plain" },
          });
        });
    })
  );
});

// Gérer les requêtes API spécifiquement
function handleApiRequest(event) {
  const url = new URL(event.request.url);

  // Stratégie spéciale pour la session (toujours essayer le réseau d'abord)
  if (url.pathname.includes("/api/auth/")) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (!response.ok) throw new Error("Réponse API non ok");

          // Mettre en cache la réponse
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        })
        .catch(async (error) => {
          console.log(
            "[Service Worker] Erreur API auth, utilisation cache:",
            error
          );

          const cachedResponse = await caches.match(event.request);
          if (cachedResponse) return cachedResponse;

          // Si pas de cache pour l'authentification, retourner session nulle
          if (url.pathname.includes("/api/auth/session")) {
            return new Response(JSON.stringify({ user: null }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          }

          // Pour les autres requêtes auth
          return new Response(
            JSON.stringify({ error: "Non disponible hors ligne" }),
            {
              status: 503,
              headers: { "Content-Type": "application/json" },
            }
          );
        })
    );
    return;
  }

  // Pour les données des tableaux, d'abord essayer le cache puis le réseau
  if (url.pathname.startsWith("/api/boards")) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        // Si cache disponible, l'utiliser immédiatement
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse.ok) {
              // Mettre à jour le cache avec la nouvelle réponse
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache);
              });
            }
            return networkResponse;
          })
          .catch(() => {
            // Si réseau échoue mais qu'on a un cache, c'est ok
            if (cachedResponse) return null;

            // Sinon retourner une réponse vide appropriée
            if (url.pathname === "/api/boards") {
              return new Response(JSON.stringify([]), {
                status: 200,
                headers: { "Content-Type": "application/json" },
              });
            } else if (url.pathname.includes("/columns")) {
              return new Response(JSON.stringify([]), {
                status: 200,
                headers: { "Content-Type": "application/json" },
              });
            } else if (url.pathname.includes("/tasks")) {
              return new Response(JSON.stringify([]), {
                status: 200,
                headers: { "Content-Type": "application/json" },
              });
            }

            // Pour les autres requêtes de tableaux
            return new Response(
              JSON.stringify({ error: "Non disponible hors ligne" }),
              {
                status: 503,
                headers: { "Content-Type": "application/json" },
              }
            );
          });

        // Retourner le cache immédiatement s'il existe, sinon attendre la requête réseau
        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // Pour les autres API
  event.respondWith(
    fetch(event.request).catch(async () => {
      const cachedResponse = await caches.match(event.request);
      return (
        cachedResponse ||
        new Response(JSON.stringify({ error: "Non disponible hors ligne" }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        })
      );
    })
  );
}

// Gestion des notifications push
self.addEventListener("push", function (event) {
  if (event.data) {
    const data = event.data.json();
    event.waitUntil(
      self.registration.showNotification(data.title, {
        body: data.body,
        icon: "/icon-192x192.png",
        data: { url: data.url },
      })
    );
  }
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});
