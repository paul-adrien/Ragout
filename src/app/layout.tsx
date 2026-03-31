import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ragout - Copilote Cuisine",
  description: "Votre copilote de cuisine branché sur votre bibliothèque personnelle",
};

export default function RootLayout({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="antialiased">{children}</body>
    </html>
  );
}
