# OpiumStock

Application web de gestion de services et d'entrées mail / mot de passe.

## Stack

- React + TypeScript + Vite
- Framer Motion
- Express
- Prisma
- PostgreSQL
- Zod

## Important

Dans cette version, les mots de passe sont volontairement stockés en clair dans PostgreSQL, conformément à la demande initiale. Cela n'est pas recommandé pour des identifiants réels et sensibles.

## Installation

Prérequis : Node.js 20+ et PostgreSQL.

1. Installer les dépendances :

```bash
npm install
```

2. Créer `.env` à partir de `.env.example` et renseigner `DATABASE_URL`.

3. Générer Prisma :

```bash
npm run db:generate
```

4. Créer / mettre à jour les tables :

```bash
npm run db:push
```

5. Lancer frontend + backend :

```bash
npm run dev
```

Frontend : http://localhost:5173  
API : http://localhost:4000

## Production

```bash
npm run build
```

Le backend devra être déployé avec une configuration adaptée (CORS, reverse proxy, HTTPS, authentification et secrets).
