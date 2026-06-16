import { NextResponse } from "next/server";
import { enqueueOrdinanceGeneration, processOrdinanceQueue } from "@/lib/ordinanceLearning/queue";
import { extractMunicipalityLabel } from "@/lib/regulatory/loadOrdinance";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { address?: string } | null;
  const address = body?.address?.trim();
  if (!address) {
    return NextResponse.json({ error: "address required" }, { status: 400 });
  }

  const municipalityLabel = extractMunicipalityLabel(address);
  const result = await enqueueOrdinanceGeneration({ address, municipalityLabel });
  void processOrdinanceQueue(1);

  return NextResponse.json(result);
}
