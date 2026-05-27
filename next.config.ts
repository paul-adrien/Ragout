import type { NextConfig } from "next";

// Origines autorisées pour l'accès au dev server depuis le LAN (téléphone).
// Définies via ALLOWED_DEV_ORIGINS (liste séparée par des virgules).
const allowedDevOrigins = (process.env.ALLOWED_DEV_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse"],
  allowedDevOrigins,
};

export default nextConfig;
