import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Le dépôt contient un package-lock.json racine (orchestrateur) en plus de celui-ci :
  // on fixe explicitement la racine du workspace pour éviter que Turbopack ne la déduise mal.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
