import { FAQItem } from "./FAQItem";

const FAQS = [
  {
    question: "Do you offer Canada-wide shipping?",
    answer:
      "Yes! We ship our treats across Canada. You can also arrange local pickup or delivery within the Montreal area.",
  },
  {
    question: "How fresh are the cookies?",
    answer:
      "Everything is baked to order in small batches, so your treats arrive as fresh as possible. We bake, then ship — never the other way around.",
  },
  {
    question: "Can I request a custom order?",
    answer:
      "Absolutely. We love custom orders for events and gifts. Add the Custom Order Deposit to your cart or reach out and we'll help plan something special.",
  },
  {
    question: "How do discount codes work?",
    answer:
      "Enter your code in the cart and we'll apply the discount to your subtotal automatically. Some codes have a minimum order amount or expiry date.",
  },
  {
    question: "How long does it take to prepare an order?",
    answer:
      "Most orders are baked within a few days. Each product lists its own prep time note so you know what to expect before you order.",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="bg-cream-50 py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-4">
        <h2 className="text-center font-serif text-3xl font-bold text-brand-900 sm:text-4xl">
          Frequently Asked Questions
        </h2>
        <div className="mt-10 space-y-3">
          {FAQS.map((faq) => (
            <FAQItem key={faq.question} {...faq} />
          ))}
        </div>
      </div>
    </section>
  );
}
