import Link from "next/link";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { getSettings } from "@/lib/settings";
import { socialUrl } from "@/lib/store-config";
import { SocialIcon, type SocialPlatform } from "./SocialIcons";

export async function Footer() {
  const settings = await getSettings();

  // An icon is shown only when its handle is set in admin Settings.
  const socials = (
    [
      { platform: "tiktok", handle: settings.social_tiktok, label: "TikTok" },
      { platform: "instagram", handle: settings.social_instagram, label: "Instagram" },
      { platform: "youtube", handle: settings.social_youtube, label: "YouTube" },
      { platform: "x", handle: settings.social_x, label: "X (Twitter)" },
    ] as { platform: SocialPlatform; handle: string | null; label: string }[]
  )
    .map((s) => ({ ...s, url: socialUrl(s.platform, s.handle) }))
    .filter((s): s is typeof s & { url: string } => Boolean(s.url));

  return (
    <footer className="bg-brand-900 text-cream-100">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          <div>
            <div className="flex items-center gap-2.5">
              <BrandLogo size={44} />
              <span className="font-serif text-lg font-bold">Zooz Treats</span>
            </div>
            <p className="mt-2 text-sm text-cream-200/80">
              Cookies &amp; Baked Goods
            </p>
            <p className="text-sm text-cream-200/80">Made in Montreal 🍁</p>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-cream-200/70">
              Follow us
            </h3>
            {socials.length > 0 ? (
              <div className="mt-3 flex items-center gap-3">
                {socials.map((s) => (
                  <a
                    key={s.platform}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    title={s.label}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-cream-100/10 text-cream-100 transition-colors hover:bg-cream-100/20 hover:text-white"
                  >
                    <SocialIcon platform={s.platform} />
                  </a>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-cream-200/60">Coming soon.</p>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-cream-200/70">
              Info
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link href="/terms" className="text-cream-100 hover:text-white">
                  Terms
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-cream-100 hover:text-white">
                  Privacy
                </Link>
              </li>
              <li>
                <Link
                  href="/refund-policy"
                  className="text-cream-100 hover:text-white"
                >
                  Refund Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-cream-100/15 pt-6 text-xs text-cream-200/60 sm:flex-row">
          <p>© {new Date().getFullYear()} Zooz Treats. All rights reserved.</p>
          <Link href="/admin/login" className="hover:text-cream-100">
            Admin login
          </Link>
        </div>
      </div>
    </footer>
  );
}
