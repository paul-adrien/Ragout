# RAGout

Copilote de cuisine branché sur votre bibliothèque personnelle d'ebooks. MVP local basé sur du RAG (Retrieval-Augmented Generation).

## Stack

- **Next.js 15** (App Router) — frontend + API
- **Bun** — runtime et package manager
- **PostgreSQL + pgvector** — stockage et recherche vectorielle
- **Ollama** — LLM et embeddings en local
- **Drizzle ORM** — accès base de données
- **Tailwind CSS 4** — styles

## Prérequis

- [Bun](https://bun.sh) (`brew install oven-sh/bun/bun`)
- [Docker](https://docs.docker.com/get-docker/) (pour PostgreSQL)
- [Ollama](https://ollama.ai) (`brew install ollama`)

## Installation

### 1. Cloner et installer les dépendances

```bash
git clone <repo-url>
cd RAGout
bun install
```

### 2. Premier lancement (setup complet)

Une seule commande pour tout installer : Docker Postgres + pgvector, migrations, modèles Ollama. (ne pas oublier de lancer docker)

```bash
bun run setup
```

Cela fait dans l'ordre :
1. Lance PostgreSQL + pgvector via Docker
2. Attend que Postgres soit prêt
3. Active l'extension pgvector + applique les migrations
4. Télécharge les modèles Ollama (nomic-embed-text + llama3)

### 3. Configurer les variables d'environnement (optionnel)

Le fichier `.env.local` est déjà créé avec les valeurs par défaut :

```env
DATABASE_URL=postgresql://ragout:ragout@localhost:5432/ragout
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_EMBED_MODEL=nomic-embed-text
OLLAMA_CHAT_MODEL=llama3
```

### 4. Lancer l'application

```bash
bun run dev
```

Ouvre [http://localhost:3000](http://localhost:3000).

## Utilisation

### Ajouter des livres

1. Sélectionner un ou plusieurs fichiers PDF/EPUB via le bouton dans le header
2. Cliquer "Lancer" pour démarrer l'ingestion en file d'attente
3. Les livres sont traités un par un (parsing → chunking → embeddings → stockage)
4. La progression s'affiche en temps réel
5. Les doublons sont détectés automatiquement

### Gérer la bibliothèque

- Cliquer "Livres" dans le header pour voir la liste des livres ingérés
- Chaque livre affiche : titre, auteur, type, nombre de chunks, date
- Possibilité de supprimer un livre (et tous ses chunks)

### Poser une question

Taper une question culinaire dans le chat :

- "Une recette de risotto aux champignons"
- "Un dessert rapide avec des pommes, sans gluten"
- "Comment faire une pâte brisée ?"

Le système va :
1. Chercher les passages les plus pertinents dans vos livres (retrieval vectoriel)
2. Générer une réponse structurée basée sur ces passages (génération RAG)
3. Afficher les sources avec liens vers les pages originales du livre

### Contraintes culinaires

Cliquer sur ⚙ à gauche de l'input pour définir des contraintes :
- Ingrédients disponibles
- Allergies / restrictions
- Style de cuisine
- Temps max de préparation
- Niveau du cuisinier

### Consulter les sources

Sous chaque réponse, des liens "📖 Nom du livre — p.42" permettent d'ouvrir le PDF original à la page exacte de la recette dans un viewer intégré.

## Architecture

```
src/
├── app/                     # Next.js App Router
│   ├── api/
│   │   ├── ingest/route.ts  # Upload + ingestion ebook
│   │   ├── chat/route.ts    # Chat RAG (streaming)
│   │   ├── books/route.ts   # Liste des livres
│   │   ├── books/[id]/       # Suppression + PDF serving
│   │   └── conversations/   # Historique conversations
│   ├── viewer/page.tsx      # Viewer PDF intégré
│   ├── layout.tsx
│   └── page.tsx             # Page principale (sidebar + chat)
├── lib/
│   ├── db/                  # Drizzle ORM + schéma
│   ├── ollama/              # Client Ollama (embeddings + chat)
│   ├── ingestion/           # Parser, chunker, pipeline
│   └── rag/                 # Retriever + générateur
├── components/              # ChatInterface, UploadForm, BookList
└── types/                   # Déclarations TypeScript
```

## Pipeline RAG

```
Ebook (PDF/EPUB)
  → Extraction texte (parser)
  → Découpage en chunks (chunker, ~1000 chars, overlap 200)
  → Embeddings via Ollama (nomic-embed-text, 768d)
  → Stockage PostgreSQL/pgvector

Question utilisateur
  → Embedding de la question
  → Recherche vectorielle (top 5 chunks)
  → Prompt avec contexte + contraintes
  → Génération via Ollama (llama3)
  → Réponse streamée
```

## Scripts

| Commande | Description |
|---|---|
| `bun run setup` | Premier lancement (Docker + migrations + modèles Ollama) |
| `bun run dev` | Lancer en mode développement |
| `bun run build` | Build de production |
| `bun run db:generate` | Générer les migrations Drizzle |
| `bun run db:migrate` | Appliquer les migrations |
| `bun run db:studio` | Ouvrir Drizzle Studio |

## État du MVP

- [x] Structure projet + config
- [x] Docker Compose PostgreSQL + pgvector
- [x] Schéma DB (books, chunks avec embeddings)
- [x] Client Ollama (embeddings + chat streaming)
- [x] Parser ebook (PDF + EPUB)
- [x] Chunker de texte
- [x] Pipeline d'ingestion complète
- [x] Retriever vectoriel
- [x] Générateur RAG avec prompt structuré
- [x] API routes (ingest, chat, books)
- [x] UI minimale (chat + upload)
- [x] Gestion des contraintes culinaires dans l'UI
- [x] Affichage de la liste des livres ingérés (modale + suppression)
- [x] Métadonnées enrichies (chapitres, pages)
- [x] Historique des conversations (sidebar + persistence DB)
- [x] Sélecteur de langue (FR/EN)
- [x] Détection de doublons à l'upload
- [x] Mémoire conversationnelle (historique dans le prompt)
- [x] Upload en lot avec file d'attente
- [x] Viewer PDF intégré avec navigation par page
- [x] Liens sources sous chaque réponse (livre + page)
