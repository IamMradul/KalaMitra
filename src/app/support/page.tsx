'use client';
import { useState } from "react";

export default function SupportPage() {
  const faqs = [
    {
      q: "How do refunds work?",
      a: "Refunds are processed by the seller after your return is approved. For physical products, you must request a return within 7 days of delivery. Refunds are issued within 5–7 business days after approval, via the original payment method. Digital products are non-refundable."
    },
    {
      q: "How do sellers get paid?",
      a: "Sellers receive payments directly to their registered bank account or UPI after a successful sale, minus any platform or payment gateway fees. KalaMitra does not hold or delay your funds."
    },
    {
      q: "Can I sell digital products?",
      a: "Yes! KalaMitra allows artisans to sell digital creations such as Kolams, templates, and craft designs. Upload your digital product in your seller dashboard."
    },
    {
      q: "Is KalaMitra free?",
      a: "Signing up and browsing is free. Sellers may be charged a small commission or service fee per sale, but there are no upfront listing fees."
    },
    {
      q: "Who handles shipping?",
      a: "All shipping and delivery are handled by the individual sellers. Tracking details are provided by the seller once your order is shipped."
    },
    {
      q: "How auctions work?",
      a: "Sellers can create live auctions for their products. Buyers can place bids in real time. The highest bidder at auction close wins the product and completes payment."
    }
  ];
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <main className="container-custom py-16 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">We’re Here to Help</h1>
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-2">Contact Options</h2>
        <ul className="list-disc pl-6 mb-2">
          <li>Email: <a href="mailto:talkto.kalamitra@gmail.com" className="text-heritage-gold underline">talkto.kalamitra@gmail.com</a></li>
          <li>Phone: <a href="tel:+919616928911" className="text-heritage-gold underline">+91 9616928911</a></li>
          <li>Response time: 24–48 hrs</li>
        </ul>
      </section>
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-2">Help Categories</h2>
        <ul className="list-disc pl-6 mb-2">
          <li>Account & onboarding</li>
          <li>Orders & payments</li>
          <li>Returns & refunds</li>
          <li>Seller tools</li>
          <li>Technical issues</li>
        </ul>
      </section>
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-2">FAQs</h2>
        <ul className="pl-0">
          {faqs.map((faq, idx) => (
            <li key={faq.q} className="mb-2 border-b border-[var(--border)] pb-2">
              <button
                className="flex items-center w-full text-left focus:outline-none group"
                onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                aria-expanded={openIndex === idx}
              >
                <span className="font-medium flex-1">{faq.q}</span>
                <span className="ml-2 transform transition-transform duration-200 group-aria-expanded:rotate-90">
                  {openIndex === idx ? "▼" : "▶"}
                </span>
              </button>
              {openIndex === idx && (
                <div className="mt-2 text-[var(--muted)] text-sm animate-fade-in">
                  {faq.a}
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-2">Seller Help</h2>
        <ul className="list-disc pl-6 mb-2">
          <li>Listing products</li>
          <li>Using AI tools</li>
          <li>Managing stalls</li>
          <li>Understanding analytics</li>
        </ul>
      </section>
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-2">Buyer Help</h2>
        <ul className="list-disc pl-6 mb-2">
          <li>Searching products</li>
          <li>AR & 3D features</li>
          <li>Gifting & group gifting</li>
          <li>Custom craft requests</li>
        </ul>
      </section>
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-2">Report an Issue</h2>
        <ul className="list-disc pl-6 mb-2">
          <li>Order issues</li>
          <li>Seller misconduct</li>
          <li>Technical bugs</li>
        </ul>
      </section>
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-2">Disclaimer</h2>
        <ul className="list-disc pl-6 mb-2">
          <li>KalaMitra is a facilitator</li>
          <li>Sellers handle fulfillment</li>
          <li>Early-stage/student platform</li>
        </ul>
      </section>
    </main>
  );
}
