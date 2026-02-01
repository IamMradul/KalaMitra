export default function TermsPage() {
  return (
    <main className="heritage-bg min-h-screen">
      {/* Header */}
      <div className="bg-[var(--bg-2)]/80 backdrop-blur-md border-b border-[var(--heritage-gold)]/20 py-12 md:py-16 relative overflow-hidden">
        <div className="container-custom max-w-4xl mx-auto relative z-10">
          <h1 className="text-4xl md:text-5xl font-bold font-serif mb-4 text-transparent bg-clip-text bg-gradient-to-r from-[var(--heritage-gold)] to-[var(--heritage-red)]">
            Terms of Service
          </h1>
          <p className="text-lg text-[var(--muted)] max-w-2xl leading-relaxed">
            Please read these terms carefully before using our platform.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="container-custom max-w-4xl mx-auto py-12">
        <div className="bg-[var(--bg-2)]/90 backdrop-blur-sm rounded-3xl shadow-soft border border-[var(--heritage-gold)]/20 p-8 md:p-12 space-y-10">

          <div className="bg-[var(--bg-1)] p-6 rounded-2xl text-[var(--muted)] text-sm mb-8 border border-[var(--heritage-gold)]/20 shadow-inner">
            <p className="font-bold text-[var(--heritage-brown)] mb-2 text-lg">This website is operated by KalaMitra.</p>
            <p className="leading-relaxed">This is a prototype/early-stage platform. By accessing or using this website, you agree to be bound by these Terms of Service. If you do not agree, please do not use the platform.</p>
          </div>

          <section>
            <h2 className="text-xl font-serif font-semibold text-[var(--heritage-brown)] mb-3 flex items-center">
              <span className="bg-[var(--heritage-gold)]/20 text-[var(--heritage-brown)] w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm">1</span>
              Platform Role
            </h2>
            <p className="text-[var(--muted)] leading-relaxed mb-3 pl-11">KalaMitra is a technology facilitator connecting independent artisans (sellers) with buyers. We do not manufacture, own, store, or ship any products. All sales, fulfillment, and shipping are handled directly by the individual sellers listed on the platform.</p>
            <p className="text-[var(--muted)] leading-relaxed pl-11">KalaMitra is not responsible for the quality, safety, legality, or delivery of products, nor for any disputes or losses arising from transactions. We only provide a platform for direct connection and communication between buyers and sellers.</p>
          </section>

          <section>
            <h2 className="text-xl font-serif font-semibold text-[var(--heritage-brown)] mb-3 flex items-center">
              <span className="bg-[var(--heritage-gold)]/20 text-[var(--heritage-brown)] w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm">2</span>
              User Responsibilities
            </h2>
            <ul className="list-disc pl-11 space-y-2 text-[var(--muted)] marker:text-[var(--heritage-gold)]">
              <li>Users must provide accurate information and comply with all applicable laws.</li>
              <li>Buyers and sellers are solely responsible for their transactions, communications, and fulfillment of obligations.</li>
              <li>Any disputes must be resolved directly between buyer and seller. KalaMitra may provide contact details to facilitate resolution but is not a party to any transaction.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-serif font-semibold text-[var(--heritage-brown)] mb-3 flex items-center">
              <span className="bg-[var(--heritage-gold)]/20 text-[var(--heritage-brown)] w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm">3</span>
              Return & Refund Policy
            </h2>
            <ul className="list-disc pl-11 space-y-2 text-[var(--muted)] marker:text-[var(--heritage-gold)]">
              <li>Returns accepted <strong>within 7 days of delivery</strong> for physical products, subject to seller&apos;s approval.</li>
              <li>Product must be <strong>unused, undamaged, and in original condition</strong>.</li>
              <li>Refunds processed <strong>within 5–7 business days</strong> after return approval by the seller.</li>
              <li>Shipping charges are <strong>non-refundable</strong>.</li>
              <li><strong>No returns or refunds</strong> for digital products once delivered/downloaded.</li>
              <li>For damaged/wrong products, contact the seller <strong>within 48 hours</strong> of delivery with images/videos.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-serif font-semibold text-[var(--heritage-brown)] mb-3 flex items-center">
              <span className="bg-[var(--heritage-gold)]/20 text-[var(--heritage-brown)] w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm">4</span>
              Cancellation, Shipping & Liability
            </h2>
            <ul className="list-disc pl-11 space-y-2 text-[var(--muted)] marker:text-[var(--heritage-gold)]">
              <li>Orders can be cancelled <strong>within 24 hours</strong> unless shipped. Custom orders cannot be cancelled.</li>
              <li>Shipping typically takes <strong>5–10 business days</strong> (Domestic).</li>
              <li>KalaMitra is not liable for indirect damages arising from platform use.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-serif font-semibold text-[var(--heritage-brown)] mb-3 flex items-center">
              <span className="bg-[var(--heritage-gold)]/20 text-[var(--heritage-brown)] w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm">5</span>
              Governing Law & Contact
            </h2>
            <p className="text-[var(--muted)] leading-relaxed mb-4 pl-11">These Terms shall be governed by the laws of India. Jurisdiction: Uttar Pradesh, India.</p>
            <div className="bg-[var(--bg-1)] p-6 rounded-2xl ml-11 border border-[var(--border)]">
              <p className="text-sm font-semibold text-[var(--heritage-brown)] mb-2">Legal Contact:</p>
              <div className="text-sm text-[var(--muted)] space-y-1">
                <p>Founder: Apoorv Gupta & Mradul Gupta</p>
                <p>Address: Moh. Daulatpur, Misrikh, Sitapur, Uttar Pradesh-261401</p>
                <p>Email: <a href="mailto:talkto.kalamitra@gmail.com" className="text-[var(--heritage-red)] hover:underline">talkto.kalamitra@gmail.com</a></p>
              </div>
            </div>
          </section>

        </div>
      </div>
    </main>
  );
}
