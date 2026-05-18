import { type NextRequest, NextResponse } from "next/server";
import {
  dismissRecommendation,
  snoozeRecommendation,
  applyRecommendation,
} from "@/lib/agentic-os-db";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { id, action, snoozeHours } = body as {
    id: number;
    action: "dismiss" | "snooze" | "apply";
    snoozeHours?: number;
  };

  if (!id || !action) {
    return NextResponse.json(
      { error: "Missing id or action" },
      { status: 400 }
    );
  }

  switch (action) {
    case "dismiss": {
      const ok = dismissRecommendation(id);
      return NextResponse.json({ success: ok, action: "dismissed" });
    }
    case "snooze": {
      const ok = snoozeRecommendation(id, snoozeHours ?? 24);
      return NextResponse.json({ success: ok, action: "snoozed", hours: snoozeHours ?? 24 });
    }
    case "apply": {
      const { recommendation } = applyRecommendation(id);
      if (!recommendation) {
        return NextResponse.json(
          { error: "Recommendation not found or already acted on" },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        action: "applied",
        recommendation,
      });
    }
    default:
      return NextResponse.json(
        { error: `Unknown action: ${action}` },
        { status: 400 }
      );
  }
}
