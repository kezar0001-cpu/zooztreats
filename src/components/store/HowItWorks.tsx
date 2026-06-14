const STEPS = [
  {
    icon: "🛒",
    title: "Pick your treats",
    body: "Browse the menu and add your favourite cookies and baked goods to your cart.",
  },
  {
    icon: "🎟️",
    title: "Add a discount code",
    body: "Got a promo code? Apply it in your cart to see your savings instantly.",
  },
  {
    icon: "🔒",
    title: "Checkout securely",
    body: "Secure online checkout is coming soon — local pickup and Canada-wide shipping.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-cream-50 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="text-center font-serif text-3xl font-bold text-brand-900 sm:text-4xl">
          How It Works
        </h2>
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <div
              key={step.title}
              className="rounded-3xl border border-cream-300 bg-white p-7 text-center shadow-soft"
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blush-100 text-2xl">
                {step.icon}
              </div>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-blush-500">
                Step {i + 1}
              </p>
              <h3 className="mt-1 font-serif text-xl font-semibold text-brand-900">
                {step.title}
              </h3>
              <p className="mt-2 text-sm text-brand-800/70">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
