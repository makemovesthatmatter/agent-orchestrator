import { NextResponse } from "next/server";
import { spawn } from "child_process";
import { getDreamScriptPath } from "@/lib/agentic-os-db";
import { existsSync } from "fs";

export const dynamic = "force-dynamic";

export async function POST() {
  const scriptPath = getDreamScriptPath();

  if (!existsSync(scriptPath)) {
    return NextResponse.json(
      { error: "Dream scheduler not found", path: scriptPath },
      { status: 404 }
    );
  }

  try {
    const child = spawn("python3", [scriptPath, "run"], {
      detached: true,
      stdio: "ignore",
      env: { ...process.env, AGENTIC_OS_UNATTENDED: "1" },
    });
    child.unref();

    return NextResponse.json({
      status: "started",
      pid: child.pid,
      message: "Dream run triggered in background",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to start dream run", detail: String(error) },
      { status: 500 }
    );
  }
}
