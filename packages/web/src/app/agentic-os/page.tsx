import type { Metadata } from "next";
import { getAgenticOSSummary } from "@/lib/agentic-os-db";
import { AgenticOSDashboard } from "@/components/agentic-os/AgenticOSDashboard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Agentic OS",
};

export default async function AgenticOSPage() {
  const summary = getAgenticOSSummary();
  return <AgenticOSDashboard summary={summary} />;
}
