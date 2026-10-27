import { NextResponse } from "next/server";

import { iaConfiguree, modelesConfigures } from "@/lib/ia/gemini.server";

/** Indique aux écrans si l'IA réelle est configurée (sans jamais exposer la clé). */
export async function GET() {
  return NextResponse.json({
    disponible: iaConfiguree(),
    modeles: iaConfiguree() ? modelesConfigures() : [],
  });
}
