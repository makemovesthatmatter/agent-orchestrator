import { type NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import {
  dismissRecommendation,
  snoozeRecommendation,
  applyRecommendation,
} from "@/lib/agentic-os-db";

export const dynamic = "force-dynamic";

function spawnAgentSession(recommendation: {
  id: number;
  type: string;
  title: string;
  description: string;
  action_payload: string | null;
}): { sessionName: string } | { error: string } {
  const prompt = [
    `## Agentic OS Recommendation #${recommendation.id}`,
    `**Type:** ${recommendation.type}`,
    `**Title:** ${recommendation.title}`,
    "",
    "### Description",
    recommendation.description,
    recommendation.action_payload
      ? `\n### Action Payload\n\`\`\`\n${recommendation.action_payload}\n\`\`\``
      : "",
    "",
    "### Instructions",
    "Apply this recommendation. Make the changes described above.",
    "When done, report what you changed.",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const child = spawn("ao", ["spawn", "--prompt", prompt], {
      detached: true,
      stdio: "ignore",
    });
    child.unref();

    return { sessionName: `pid-${child.pid}` };
  } catch (err) {
    return { error: String(err) };
  }
}

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

      const result = spawnAgentSession(recommendation);
      if ("error" in result) {
        return NextResponse.json({
          success: true,
          action: "applied",
          recommendation,
          session: null,
          spawnError: result.error,
        });
      }

      return NextResponse.json({
        success: true,
        action: "applied",
        recommendation,
        session: result.sessionName,
      });
    }
    default:
      return NextResponse.json(
        { error: `Unknown action: ${action}` },
        { status: 400 }
      );
  }
}
