import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCostDetails } from "@/lib/agentic-os-db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const period = request.nextUrl.searchParams.get("period") ?? "30d";
  try {
    const costs = getCostDetails(period);
    return NextResponse.json({ costs });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to read cost data", detail: String(error) },
      { status: 500 }
    );
  }
}
