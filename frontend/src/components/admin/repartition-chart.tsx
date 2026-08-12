"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/**
 * Graphique de répartition des tâches par statut (supervision technique).
 *
 * Isolé dans son propre composant pour être chargé par `next/dynamic({ ssr: false })` depuis
 * la page - `recharts` est une dépendance volumineuse qui n'a pas besoin d'être incluse dans
 * le bundle initial ni rendue côté serveur (elle manipule le DOM/SVG côté client).
 */
export function RepartitionChart({ data }: { data: { statut: string; valeur: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="statut" fontSize={12} tickLine={false} />
        <YAxis allowDecimals={false} fontSize={12} tickLine={false} />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--popover)",
            color: "var(--popover-foreground)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Bar dataKey="valeur" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
