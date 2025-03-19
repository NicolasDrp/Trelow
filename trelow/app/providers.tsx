"use client";

import { SessionProvider } from "next-auth/react";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

function PushNotificationHandler() {
  const { data: session } = useSession();
  const [permission, setPermission] = useState<NotificationPermission | null>(
    null
  );

  useEffect(() => {
    if (!session?.user || !("Notification" in window)) return;
    setPermission(Notification.permission);

    if (Notification.permission === "granted") {
      registerServiceWorker();
    }
  }, [session]);

  async function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      const subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        const newSubscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(
            process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ""
          ),
        });

        await saveSubscription(newSubscription);
      }
    } catch (error) {
      console.error("Erreur d'enregistrement du service worker:", error);
    }
  }

  async function requestPermission() {
    try {
      const permission = await Notification.requestPermission();
      setPermission(permission);

      if (permission === "granted") {
        await registerServiceWorker();
      }
    } catch (error) {
      console.error("Erreur de demande d'autorisation:", error);
    }
  }

  async function saveSubscription(subscription: PushSubscription) {
    try {
      await fetch("/api/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription),
      });
    } catch (error) {
      console.error("Erreur de sauvegarde de l'abonnement:", error);
    }
  }

  if (
    !session?.user ||
    permission === "granted" ||
    !("Notification" in window)
  ) {
    return null;
  }

  return (
    <button
      onClick={requestPermission}
      className="fixed bottom-4 right-4 bg-blue-500 text-white px-4 py-2 rounded shadow-lg z-50"
    >
      Activer les notifications
    </button>
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <PushNotificationHandler />
    </SessionProvider>
  );
}
