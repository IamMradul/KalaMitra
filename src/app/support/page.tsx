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
    <main className="heritage-bg min-h-screen">
      {/* Header */}
      <div className="bg-[var(--bg-2)]/80 backdrop-blur-md border-b border-[var(--heritage-gold)]/20 py-12 md:py-16 relative overflow-hidden">
        <div className="container-custom max-w-4xl mx-auto relative z-10">
          <h1 className="text-4xl md:text-5xl font-bold font-serif mb-4 text-transparent bg-clip-text bg-gradient-to-r from-[var(--heritage-gold)] to-[var(--heritage-red)]">
            We’re Here to Help
          </h1>
          <p className="text-lg text-[var(--muted)] max-w-2xl leading-relaxed">
            Find answers to common questions or reach out to our team.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="container-custom max-w-4xl mx-auto py-12 space-y-8">

        {/* Contact Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-[var(--bg-2)]/90 backdrop-blur-sm p-6 rounded-2xl border border-[var(--heritage-gold)]/20 shadow-soft">
            <h2 className="text-xl font-serif font-bold text-[var(--heritage-brown)] mb-3">Direct Support</h2>
            <ul className="space-y-2 text-[var(--muted)]">
              <li><strong className="text-[var(--text)]">Email:</strong> <a href="mailto:talkto.kalamitra@gmail.com" className="hover:text-[var(--heritage-red)] text-[var(--heritage-gold)] transition-colors">talkto.kalamitra@gmail.com</a></li>
              <li><strong className="text-[var(--text)]">Phone:</strong> <a href="tel:+919616928911" className="hover:text-[var(--heritage-red)] text-[var(--heritage-gold)] transition-colors">+91 9616928911</a></li>
              <li><strong className="text-[var(--text)]">Response Time:</strong> 24–48 hrs</li>
            </ul>
          </div>

          <div className="bg-[var(--bg-2)]/90 backdrop-blur-sm p-6 rounded-2xl border border-[var(--heritage-gold)]/20 shadow-soft">
            <h2 className="text-xl font-serif font-bold text-[var(--heritage-brown)] mb-3">Report Issues</h2>
            <p className="text-[var(--muted)] mb-3">Facing a technical bug, seller misconduct, or order discrepancy?</p>
            <button className="text-[var(--heritage-red)] font-semibold hover:underline flex items-center gap-2">
              Report an Issue <span>→</span>
            </button>
          </div>
        </div>

        {/* FAQs */}
        <div className="bg-[var(--bg-2)]/90 backdrop-blur-sm rounded-3xl shadow-soft border border-[var(--heritage-gold)]/20 p-8 md:p-10">
          <h2 className="text-2xl font-serif font-bold text-[var(--heritage-brown)] mb-8 flex items-center gap-3">
            <span className="w-1.5 h-8 bg-[var(--heritage-gold)] rounded-full"></span>
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div key={faq.q} className="border-b border-[var(--border)] last:border-0 pb-4 last:pb-0">
                <button
                  className="flex items-center justify-between w-full text-left py-2 focus:outline-none group"
                  onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                >
                  <span className={`text-lg font-medium transition-colors font-serif ${openIndex === idx ? 'text-[var(--heritage-brown)]' : 'text-[var(--text)]'}`}>
                    {faq.q}
                  </span>
                  <span className={`ml-4 transform transition-transform duration-300 text-[var(--heritage-gold)] ${openIndex === idx ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </button>
                <div
                  className={`grid transition-all duration-300 ease-in-out ${openIndex === idx ? 'grid-rows-[1fr] opacity-100 mt-2' : 'grid-rows-[0fr] opacity-0'}`}
                >
                  <div className="overflow-hidden text-[var(--muted)] leading-relaxed pl-1 border-l-2 border-[var(--heritage-gold)]/30 ml-1">
                    {faq.a}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Categories */}
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-[var(--heritage-brown)] font-serif border-b border-[var(--heritage-gold)]/20 pb-2">Seller Help</h3>
            <ul className="space-y-2 text-[var(--muted)] list-disc pl-5 marker:text-[var(--heritage-gold)]">
              <li>Listing products</li>
              <li>Using AI tools</li>
              <li>Managing stalls</li>
              <li>Understanding analytics</li>
            </ul>
          </div>
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-[var(--heritage-brown)] font-serif border-b border-[var(--heritage-gold)]/20 pb-2">Buyer Help</h3>
            <ul className="space-y-2 text-[var(--muted)] list-disc pl-5 marker:text-[var(--heritage-green)]">
              <li>Searching products</li>
              <li>AR & 3D features</li>
              <li>Gifting & group gifting</li>
              <li>Custom craft requests</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
