export default function AboutPage() {
  return (
    <main className="heritage-bg min-h-screen">
      {/* Header */}
      <div className="bg-[var(--bg-2)]/80 backdrop-blur-md border-b border-[var(--heritage-gold)]/20 py-12 md:py-16 relative overflow-hidden">
        {/* Decorative background accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--heritage-gold)]/10 rounded-full blur-3xl -mr-32 -mt-32"></div>

        <div className="container-custom max-w-4xl mx-auto relative z-10">
          <h1 className="text-4xl md:text-5xl font-bold font-serif mb-4 text-transparent bg-clip-text bg-gradient-to-r from-[var(--heritage-gold)] to-[var(--heritage-red)]">
            About KalaMitra
          </h1>
          <p className="text-lg text-[var(--muted)] max-w-2xl leading-relaxed">
            Empowering artisans and connecting cultures through technology.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="container-custom max-w-4xl mx-auto py-12">
        <div className="bg-[var(--bg-2)]/90 backdrop-blur-sm rounded-3xl shadow-soft border border-[var(--heritage-gold)]/20 p-8 md:p-12 space-y-12 relative overflow-hidden">

          {/* Corner flourish */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[var(--heritage-gold)]/5 to-transparent"></div>

          <section className="space-y-6">
            <h2 className="text-2xl font-serif font-semibold text-[var(--heritage-brown)] border-l-4 border-[var(--heritage-gold)] pl-4">How KalaMitra Was Formed</h2>
            <div className="prose prose-lg text-[var(--muted)] leading-relaxed space-y-4 max-w-none">
              <p>KalaMitra began as an inspiring vision by Apoorv Gupta and Mradul Gupta, founders of Team ThinkTech, who decided to solve the real problems artisans face today.</p>
              <p>In the world of an evolving Aatma Nirbhar Bharat – a self-reliant country, a vision ignited by our Hon’ble Prime Minister Shri Narendra Modi – one thing is clear: India’s cultural strength lies in the hands of its artisans. But this challenge is not limited to India. Across the world, local artisans face the same struggle.</p>
              <p>Whether it’s about receiving the fair price their craft truly deserves, or depending upon middlemen, local stalls, or seasonal markets, artisans often earn only a fraction of the value of their work. But it’s not just the makers who struggle—buyers are losing out, too. Because the connection is broken, buyers get mass-produced items, and artisans stay sidelined.</p>
              <p>That’s where KalaMitra comes in. KalaMitra is an AI-powered cultural marketplace — a digital companion for artisans, buyers, and cultural brands. It removes the biggest barriers to self-reliance. Whether it’s tackling capital with the opportunity to create and sell virtual products from our own app with zero investment, or creating useful products for selling from donated & leftover items and waste materials!</p>
              <p>It’s not only about artisans. Buyers get a rich, immersive experience through stories, voice interaction, AR visualization, and direct connection with creators.</p>
              <p>Unlike traditional marketplaces, KalaMitra is not static. It’s a living cultural hub — with AI, 3D bazaars, auctions, collaborations, and community features — all in one place.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-semibold text-[var(--heritage-brown)] border-l-4 border-[var(--heritage-gold)] pl-4 mb-8">Features</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4 bg-[var(--bg-1)]/50 p-6 rounded-2xl border border-[var(--border)]">
                <h3 className="text-lg font-bold text-[var(--heritage-red)] uppercase tracking-wider text-sm flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[var(--heritage-red)]"></span> Seller Features
                </h3>
                <ul className="space-y-3 text-[var(--muted)]">
                  <li className="flex items-start"><span className="mr-2 text-[var(--heritage-gold)]">✓</span> Virtual Stall Management</li>
                  <li className="flex items-start"><span className="mr-2 text-[var(--heritage-gold)]">✓</span> Product Management & AI Tools</li>
                  <li className="flex items-start"><span className="mr-2 text-[var(--heritage-gold)]">✓</span> Virtual Products & Auctions</li>
                  <li className="flex items-start"><span className="mr-2 text-[var(--heritage-gold)]">✓</span> Seller Analytics & Schemes</li>
                </ul>
              </div>
              <div className="space-y-4 bg-[var(--bg-1)]/50 p-6 rounded-2xl border border-[var(--border)]">
                <h3 className="text-lg font-bold text-[var(--heritage-green)] uppercase tracking-wider text-sm flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[var(--heritage-green)]"></span> Buyer Features
                </h3>
                <ul className="space-y-3 text-[var(--muted)]">
                  <li className="flex items-start"><span className="mr-2 text-[var(--heritage-gold)]">✓</span> Marketplace Browsing & Search</li>
                  <li className="flex items-start"><span className="mr-2 text-[var(--heritage-gold)]">✓</span> AR Visualization & 3D Bazaar</li>
                  <li className="flex items-start"><span className="mr-2 text-[var(--heritage-gold)]">✓</span> Gifting & Custom Requests</li>
                  <li className="flex items-start"><span className="mr-2 text-[var(--heritage-gold)]">✓</span> Story Narration & AI Chatbot</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="bg-gradient-to-r from-[var(--bg-1)] to-[var(--bg-2)] rounded-2xl p-6 md:p-8 border border-[var(--border)]">
            <h2 className="text-2xl font-serif font-semibold text-[var(--heritage-brown)] mb-4">Contact & Legal</h2>
            <div className="space-y-2 text-[var(--muted)]">
              <p>For support or queries, contact: <a href="mailto:talkto.kalamitra@gmail.com" className="text-[var(--heritage-red)] font-medium hover:underline">talkto.kalamitra@gmail.com</a></p>
              <div className="pt-4 border-t border-[var(--heritage-gold)]/20 mt-4">
                <p><strong>Founder:</strong> Apoorv Gupta & Mradul Gupta</p>
                <p><strong>Role:</strong> Student Founder Team, KalaMitra</p>
                <p><strong>Address:</strong> Moh. Daulatpur, Misrikh, Sitapur, Uttar Pradesh-261401</p>
              </div>
            </div>
          </section>

        </div>
      </div>
    </main>
  );
}
