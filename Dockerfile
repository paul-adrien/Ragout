# --- Build + runtime pour l'app Next.js (Bun) ---
FROM oven/bun:1 AS base
WORKDIR /app

# Dépendances (cache séparé)
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Code + build de prod
COPY . .
RUN bun run build

EXPOSE 3000

# Migrations DB puis démarrage du serveur (écoute sur tout le réseau)
CMD ["sh", "-c", "bun run db:migrate && bunx next start -H 0.0.0.0 -p 3000"]
