import Link from "next/link";
import { BrandLogo } from "@/components/brand/BrandLogo";

export function Footer() {
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
              Stay in touch
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cream-100 hover:text-white"
                >
                  Instagram @zooztreats
                </a>
              </li>
              <li>
                <a
                  href="mailto:hello@zooztreats.ca"
                  className="text-cream-100 hover:text-white"
                >
                  hello@zooztreats.ca
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-cream-200/70">
              Info
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <a href="#" className="text-cream-100 hover:text-white">
                  Terms
                </a>
              </li>
              <li>
                <a href="#" className="text-cream-100 hover:text-white">
                  Privacy
                </a>
              </li>
              <li>
                <a href="#" className="text-cream-100 hover:text-white">
                  Refund Policy
                </a>
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
