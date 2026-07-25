import { NextResponse } from "next/server";
import { getPlayersBrowseData } from "@/lib/players-browse-data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const payload = await getPlayersBrowseData();

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load player browser data.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
