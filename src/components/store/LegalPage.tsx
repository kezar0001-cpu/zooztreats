import { Header } from "@/components/store/Header";
import { Footer } from "@/components/store/Footer";
import { CartDrawer } from "@/components/store/CartDrawer";

// Shared shell for the Terms / Privacy / Refund pages. Content is admin-editable
// plain text (from Settings), rendered with paragraph spacing preserved.
export function LegalPage({
  title,
  content,
}: {
  title: string;
  content: string | null;
}) {
  return (
    <div className="bg-cream-50">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="font-serif text-3xl font-bold text-brand-900">{title}</h1>
        {content && content.trim() ? (
          <div className="mt-6 whitespace-pre-line leading-relaxed text-brand-800/80">
            {content}
          </div>
        ) : (
          <p className="mt-6 text-brand-800/70">This page is coming soon.</p>
        )}
      </main>
      <Footer />
      <CartDrawer />
    </div>
  );
}
