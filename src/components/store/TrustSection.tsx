const ITEMS = [
  { icon: "🥣", title: "Small batch", body: "Made in small batches for quality and freshness." },
  { icon: "💛", title: "Baked with care", body: "Every order is baked by hand with love." },
  { icon: "🍁", title: "Montreal based", body: "Proudly baked in Montreal, Quebec." },
  { icon: "📦", title: "Canada-wide shipping", body: "Treats shipped across Canada to your door." },
];

export function TrustSection() {
  return (
    <section className="bg-gradient-to-b from-cream-100 to-blush-50 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          {ITEMS.map((item) => (
            <div
              key={item.title}
              className="rounded-3xl border border-cream-300 bg-white/80 p-6 text-center shadow-soft"
            >
              <div className="text-3xl">{item.icon}</div>
              <h3 className="mt-3 font-serif text-lg font-semibold text-brand-900">
                {item.title}
              </h3>
              <p className="mt-1 text-sm text-brand-800/70">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
