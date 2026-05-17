import { NextResponse } from "next/server";
import { getAgenticOSSummary } from "@/lib/agentic-os-db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const summary = getAgenticOSSummary();
    return NextResponse.json(summary);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to read Agentic OS data", detail: String(error) },
      { status: 500 }
    );
  }
}
