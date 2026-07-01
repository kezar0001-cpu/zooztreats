import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { LegalPage } from "@/components/store/LegalPage";

export const metadata: Metadata = { title: "Privacy Policy" };

export default async function PrivacyPage() {
  const settings = await getSettings();
  return <LegalPage title="Privacy Policy" content={settings.privacy_content} />;
}
