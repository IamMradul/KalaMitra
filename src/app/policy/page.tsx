export default function PolicyPage() {
  return (
    <main className="heritage-bg min-h-screen">
      {/* Header */}
      <div className="bg-[var(--bg-2)]/80 backdrop-blur-md border-b border-[var(--heritage-gold)]/20 py-12 md:py-16 relative overflow-hidden">
        <div className="container-custom max-w-4xl mx-auto relative z-10">
          <h1 className="text-4xl md:text-5xl font-bold font-serif mb-4 text-transparent bg-clip-text bg-gradient-to-r from-[var(--heritage-gold)] to-[var(--heritage-red)]">
            Privacy Policy
          </h1>
          <p className="text-lg text-[var(--muted)] max-w-2xl leading-relaxed">
            Your trust is important to us. Learn how we handle your data.
          </p>
          <div className="mt-4 inline-flex items-center px-4 py-1.5 bg-[var(--bg-1)]/50 border border-[var(--heritage-gold)]/30 rounded-full text-sm text-[var(--heritage-brown)] font-medium">
            Last Updated: January 9, 2026
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container-custom max-w-4xl mx-auto py-12">
        <div className="bg-[var(--bg-2)]/90 backdrop-blur-sm rounded-3xl shadow-soft border border-[var(--heritage-gold)]/20 p-8 md:p-12 space-y-10">

          <section className="space-y-4">
            <h2 className="text-2xl font-serif font-semibold text-[var(--heritage-brown)] flex items-center gap-3">
              <span className="w-1.5 h-8 bg-[var(--heritage-gold)] rounded-full"></span>
              Your Privacy
            </h2>
            <div className="prose text-[var(--muted)] max-w-none space-y-4 leading-relaxed">
              <p>KalaMitra values your privacy. This is a prototype/early-stage platform. We collect only the information necessary to facilitate transactions and improve your experience. Your data is never sold to third parties.</p>
              <p>KalaMitra may use basic cookies or analytics tools to improve platform performance and user experience. These do not collect sensitive personal data.</p>
              <p>We may collect your name, contact details, and transaction information when you use our platform. This information is used solely to connect buyers and sellers and to provide you with a seamless experience.</p>
              <p>KalaMitra does not take responsibility for any actions, omissions, or issues arising from transactions between buyers and sellers. We only provide a platform for direct connection and communication between users. All sales, fulfillment, and shipping are handled by individual sellers listed on the platform.</p>
              <p className="bg-[var(--bg-1)] p-4 rounded-xl border border-[var(--heritage-gold)]/20 inline-block">
                For any privacy-related queries, contact: <a href="mailto:talkto.kalamitra@gmail.com" className="text-[var(--heritage-red)] font-bold hover:underline">talkto.kalamitra@gmail.com</a>
              </p>
            </div>
          </section>

          <hr className="border-[var(--heritage-gold)]/20" />

          <section className="space-y-4">
            <h2 className="text-2xl font-serif font-semibold text-[var(--heritage-brown)] flex items-center gap-3">
              <span className="w-1.5 h-8 bg-[var(--heritage-gold)] rounded-full"></span>
              Data Security
            </h2>
            <p className="text-[var(--muted)] leading-relaxed">
              We implement reasonable security measures to protect your data. However, KalaMitra is not responsible for any unauthorized access or misuse of your information by third parties, including sellers or other users.
            </p>
          </section>

          <hr className="border-[var(--heritage-gold)]/20" />

          <section className="space-y-4">
            <h2 className="text-2xl font-serif font-semibold text-[var(--heritage-brown)] flex items-center gap-3">
              <span className="w-1.5 h-8 bg-[var(--heritage-gold)] rounded-full"></span>
              Third-Party Links
            </h2>
            <p className="text-[var(--muted)] leading-relaxed">
              Our platform may contain links to third-party websites or services. KalaMitra is not responsible for the privacy practices or content of those third parties.
            </p>
          </section>

          <hr className="border-[var(--heritage-gold)]/20" />

          <section className="space-y-4">
            <h2 className="text-2xl font-serif font-semibold text-[var(--heritage-brown)] flex items-center gap-3">
              <span className="w-1.5 h-8 bg-[var(--heritage-gold)] rounded-full"></span>
              Platform Role Disclaimer
            </h2>
            <p className="text-[var(--muted)] leading-relaxed">
              KalaMitra is a technology facilitator and does not directly manufacture, sell, or ship products. We are not responsible for any disputes, losses, or damages arising from transactions between buyers and sellers. In case of any issues, you may be provided with the artisan&apos;s contact for direct resolution.
            </p>
          </section>

        </div>
      </div>
    </main>
  );
}
