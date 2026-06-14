export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-blush-50 via-cream-50 to-cream-100">
      <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:py-24">
        <p className="mx-auto inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-1.5 text-sm font-medium text-brand-700 shadow-sm">
          🍪 Cookies &amp; Baked Goods · Made in Montreal
        </p>

        <h1 className="mx-auto mt-6 max-w-3xl font-serif text-4xl font-bold leading-tight text-brand-900 sm:text-6xl">
          Dangerously Good Cookies, Baked Fresh
        </h1>

        <p className="mx-auto mt-5 max-w-2xl text-lg text-brand-800/80">
          Homemade cookies and baked goods from Montreal, available for local
          orders and Canada-wide shipping.
        </p>

        <p className="mt-3 text-sm italic text-brand-700/70">
          Just a young wifey baking dangerously good cookies 💛
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a href="#menu" className="store-btn-primary w-full sm:w-auto">
            Order Now
          </a>
          <a href="#menu" className="store-btn-secondary w-full sm:w-auto">
            View Menu
          </a>
        </div>
      </div>
    </section>
  );
}
