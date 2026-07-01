import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { LegalPage } from "@/components/store/LegalPage";

export const metadata: Metadata = { title: "Terms of Service" };

export default async function TermsPage() {
  const settings = await getSettings();
  return <LegalPage title="Terms of Service" content={settings.terms_content} />;
}
