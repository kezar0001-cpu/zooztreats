import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { LegalPage } from "@/components/store/LegalPage";

export const metadata: Metadata = { title: "Refund Policy" };

export default async function RefundPolicyPage() {
  const settings = await getSettings();
  return <LegalPage title="Refund Policy" content={settings.refund_content} />;
}
