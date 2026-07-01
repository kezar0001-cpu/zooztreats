import { getSettingsForAdmin, getAllRibbonColours } from "@/lib/settings";
import { SettingsPanel } from "@/components/admin/SettingsPanel";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [settings, ribbons] = await Promise.all([
    getSettingsForAdmin(),
    getAllRibbonColours(),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Delivery times, the expedite option, box option pricing, social links
          and your legal pages.
        </p>
      </div>
      <SettingsPanel settings={settings} ribbons={ribbons} />
    </div>
  );
}
