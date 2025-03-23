import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import Script from "next/script";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Trelow",
  description: "Une application de gestion de tâches",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <head>
        <meta name="theme-color" content="#f46b45" />
      </head>
      <body className={inter.className}>
        <Providers>{children}</Providers>
        <Script id="register-sw" strategy="beforeInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js')
                  .then(function(registration) {
                    console.log('Service Worker enregistré avec succès:', registration.scope);
                    
                    // Vérifier si le service worker a besoin d'être mis à jour
                    registration.addEventListener('updatefound', function() {
                      // Un nouveau service worker est en cours d'installation
                      const newWorker = registration.installing;
                      console.log('Nouveau Service Worker en cours d\'installation');
                      
                      newWorker.addEventListener('statechange', function() {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                          console.log('Nouveau Service Worker installé et en attente d\'activation');
                        }
                      });
                    });
                  })
                  .catch(function(error) {
                    console.error('Échec enregistrement du Service Worker:', error);
                  });
                  
                // Écouter les mises à jour du service worker
                navigator.serviceWorker.addEventListener('controllerchange', function() {
                  console.log('Service Worker mis à jour');
                });
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}
