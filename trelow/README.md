# Trelow - Application Kanban

Trelow est une application Kanban de gestion de tâches avec fonctionnalités hors ligne et notifications push.

## Prérequis

- Node.js 18+
- PostgreSQL (local ou distant)
- npm ou yarn

## Installation

Clonez le dépôt et installez les dépendances :

```bash
git clone https://github.com/votre-utilisateur/trelow.git
cd trelow
npm install
# ou
yarn install
```

## Configuration des variables d'environnement

1. Copiez le fichier `.env.example` en `.env` :

```bash
cp .env.example .env
```

2. Configurez les variables dans le fichier `.env` :

```.env
# URL de connexion à la base de données PostgreSQL
DATABASE_URL="postgresql://username:password@localhost:5432/trelow"

# Clé secrète pour NextAuth (générez-la avec `openssl rand -base64 32`)
NEXTAUTH_SECRET="votre-clé-secrète"
NEXTAUTH_URL="http://localhost:3000"

# Clés VAPID pour les notifications push
# Générez-les avec le code suivant dans un script Node.js :
# const webpush = require('web-push');
# const vapidKeys = webpush.generateVAPIDKeys();
# console.log(vapidKeys);
NEXT_PUBLIC_VAPID_PUBLIC_KEY="votre-clé-publique"
VAPID_PRIVATE_KEY="votre-clé-privée"
```

## Configuration de la base de données avec Prisma

1. Assurez-vous que PostgreSQL est en cours d'exécution et que l'URL dans `.env` est correcte

2. Générez le client Prisma :

```bash
npx prisma generate
```

3. Créez les tables dans la base de données :

```bash
npx prisma migrate dev --name init
```

## Démarrage de l'application

### Mode développement

```bash
npm run dev
# ou
yarn dev
```

Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur.

### Construction pour la production

```bash
npm run build
# ou
yarn build
```

### Démarrage en mode production

```bash
npm run start
# ou
yarn start
```

## Fonctionnalités

- Tableaux Kanban avec colonnes personnalisables
- Glisser-déposer des tâches entre colonnes
- Définition de priorités (faible, moyenne, haute)
- Mode hors ligne avec synchronisation automatique
- Notifications push pour les mises à jour

## Technologies utilisées

- Next.js 15
- React 19
- TypeScript
- Prisma avec PostgreSQL
- TailwindCSS
- Service Workers pour le mode hors ligne
- Web Push API pour les notifications
