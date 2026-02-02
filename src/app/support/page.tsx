'use client';
import { useState } from "react";
import { useTranslation } from 'react-i18next';

export default function SupportPage() {
  const { t } = useTranslation();

  const faqs = [
    {
      q: t('support.faqs.refunds.q'),
      a: t('support.faqs.refunds.a')
    },
    {
      q: t('support.faqs.payments.q'),
      a: t('support.faqs.payments.a')
    },
    {
      q: t('support.faqs.digital.q'),
      a: t('support.faqs.digital.a')
    },
    {
      q: t('support.faqs.free.q'),
      a: t('support.faqs.free.a')
    },
    {
      q: t('support.faqs.shipping.q'),
      a: t('support.faqs.shipping.a')
    },
    {
      q: t('support.faqs.auctions.q'),
      a: t('support.faqs.auctions.a')
    }
  ];
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <main className="heritage-bg min-h-screen">
      {/* Header */}
      <div className="bg-[var(--bg-2)]/80 backdrop-blur-md border-b border-[var(--heritage-gold)]/20 py-12 md:py-16 relative overflow-hidden">
        <div className="container-custom max-w-4xl mx-auto relative z-10">
          <h1 className="text-4xl md:text-5xl font-bold font-serif mb-4 text-transparent bg-clip-text bg-gradient-to-r from-[var(--heritage-gold)] to-[var(--heritage-red)]">
            {t('support.title')}
          </h1>
          <p className="text-lg text-[var(--muted)] max-w-2xl leading-relaxed">
            {t('support.subtitle')}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="container-custom max-w-4xl mx-auto py-12 space-y-8">

        {/* Contact Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-[var(--bg-2)]/90 backdrop-blur-sm p-6 rounded-2xl border border-[var(--heritage-gold)]/20 shadow-soft">
            <h2 className="text-xl font-serif font-bold text-[var(--heritage-brown)] mb-3">{t('support.directSupportTitle')}</h2>
            <ul className="space-y-2 text-[var(--muted)]">
              <li><strong className="text-[var(--text)]">{t('support.emailLabel')}:</strong> <a href="mailto:talkto.kalamitra@gmail.com" className="hover:text-[var(--heritage-red)] text-[var(--heritage-gold)] transition-colors">talkto.kalamitra@gmail.com</a></li>
              <li><strong className="text-[var(--text)]">{t('support.phoneLabel')}:</strong> <a href="tel:+919616928911" className="hover:text-[var(--heritage-red)] text-[var(--heritage-gold)] transition-colors">+91 9616928911</a></li>
              <li><strong className="text-[var(--text)]">{t('support.responseTimeLabel')}:</strong> {t('support.responseTimeVal')}</li>
            </ul>
          </div>

          <div className="bg-[var(--bg-2)]/90 backdrop-blur-sm p-6 rounded-2xl border border-[var(--heritage-gold)]/20 shadow-soft">
            <h2 className="text-xl font-serif font-bold text-[var(--heritage-brown)] mb-3">{t('support.reportIssuesTitle')}</h2>
            <p className="text-[var(--muted)] mb-3">{t('support.reportIssuesDesc')}</p>
            <button className="text-[var(--heritage-red)] font-semibold hover:underline flex items-center gap-2">
              {t('support.reportButton')} <span>→</span>
            </button>
          </div>
        </div>

        {/* FAQs */}
        <div className="bg-[var(--bg-2)]/90 backdrop-blur-sm rounded-3xl shadow-soft border border-[var(--heritage-gold)]/20 p-8 md:p-10">
          <h2 className="text-2xl font-serif font-bold text-[var(--heritage-brown)] mb-8 flex items-center gap-3">
            <span className="w-1.5 h-8 bg-[var(--heritage-gold)] rounded-full"></span>
            {t('support.faqTitle')}
          </h2>
          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div key={idx} className="border-b border-[var(--border)] last:border-0 pb-4 last:pb-0">
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
            <h3 className="text-lg font-bold text-[var(--heritage-brown)] font-serif border-b border-[var(--heritage-gold)]/20 pb-2">{t('support.sellerHelpTitle')}</h3>
            <ul className="space-y-2 text-[var(--muted)] list-disc pl-5 marker:text-[var(--heritage-gold)]">
              {(t('support.sellerHelpList', { returnObjects: true }) as string[]).map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-[var(--heritage-brown)] font-serif border-b border-[var(--heritage-gold)]/20 pb-2">{t('support.buyerHelpTitle')}</h3>
            <ul className="space-y-2 text-[var(--muted)] list-disc pl-5 marker:text-[var(--heritage-green)]">
              {(t('support.buyerHelpList', { returnObjects: true }) as string[]).map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
