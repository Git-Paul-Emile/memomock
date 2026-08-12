"use client";

// Error Boundary racine (App Router : convention de fichier `global-error.tsx`). Ne se
// déclenche que si `layout.tsx` lui-même échoue (cas rare) - `error.tsx` ne suffit pas dans ce
// cas puisqu'il est rendu À L'INTÉRIEUR du layout racine. Doit donc fournir son propre
// <html>/<body>, le layout habituel n'étant plus disponible.
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr">
      <body>
        <div
          style={{
            display: "flex",
            minHeight: "100vh",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1rem",
            padding: "1rem",
            textAlign: "center",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Une erreur critique est survenue</h1>
          <p style={{ color: "#666", fontSize: "0.875rem" }}>
            L&apos;application n&apos;a pas pu démarrer correctement. Merci de réessayer.
          </p>
          <button
            onClick={reset}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "0.375rem",
              backgroundColor: "#111",
              color: "#fff",
              fontSize: "0.875rem",
              border: "none",
              cursor: "pointer",
            }}
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}
