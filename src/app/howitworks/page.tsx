export default function HowItWorksPage() {
  return (
    <main className="heritage-bg min-h-screen">
      {/* Header */}
      <div className="bg-[var(--bg-2)]/80 backdrop-blur-md border-b border-[var(--heritage-gold)]/20 py-12 md:py-16 relative overflow-hidden">
        <div className="container-custom max-w-4xl mx-auto relative z-10">
          <h1 className="text-4xl md:text-5xl font-bold font-serif mb-4 text-transparent bg-clip-text bg-gradient-to-r from-[var(--heritage-gold)] to-[var(--heritage-red)]">
            How It Works
          </h1>
          <p className="text-lg text-[var(--muted)] max-w-2xl leading-relaxed">
            From skill to sale: Your journey on KalaMitra explained.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="container-custom max-w-4xl mx-auto py-12">

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Artisans Card */}
          <div className="bg-[var(--bg-2)]/90 backdrop-blur-sm rounded-3xl shadow-soft border border-[var(--heritage-gold)]/20 p-8 hover:shadow-glow transition-shadow duration-300">
            <div className="w-16 h-16 bg-gradient-to-br from-[var(--heritage-gold)] to-[var(--heritage-red)] rounded-full flex items-center justify-center text-white text-3xl font-bold mb-6 font-serif shadow-lg">
              1
            </div>
            <h2 className="text-2xl font-serif font-bold text-[var(--heritage-brown)] mb-6">For Artisans</h2>
            <ol className="space-y-4">
              {[
                "Sign up as Seller",
                "Create your virtual or 3D stall",
                "Add physical or digital products",
                "Use AI for pricing, stories & ads",
                "Sell via marketplace, reels, auctions",
                "Receive payments & analytics"
              ].map((step, i) => (
                <li key={i} className="flex items-start text-[var(--muted)]">
                  <span className="font-bold text-[var(--heritage-gold)] mr-3">{i + 1}.</span>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          {/* Buyers Card */}
          <div className="bg-[var(--bg-2)]/90 backdrop-blur-sm rounded-3xl shadow-soft border border-[var(--heritage-gold)]/20 p-8 hover:shadow-glow transition-shadow duration-300">
            <div className="w-16 h-16 bg-gradient-to-br from-[var(--heritage-green)] to-[var(--heritage-blue)] rounded-full flex items-center justify-center text-white text-3xl font-bold mb-6 font-serif shadow-lg">
              2
            </div>
            <h2 className="text-2xl font-serif font-bold text-[var(--heritage-brown)] mb-6">For Buyers</h2>
            <ol className="space-y-4">
              {[
                "Sign up as Buyer",
                "Browse or speak to search",
                "Discover stories & artisans",
                "Visualize via AR / explore 3D Bazaar",
                "Buy, bid, gift, or request custom crafts",
                "Track orders & get recommendations"
              ].map((step, i) => (
                <li key={i} className="flex items-start text-[var(--muted)]">
                  <span className="font-bold text-[var(--heritage-green)] mr-3">{i + 1}.</span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-[var(--bg-2)]/80 rounded-3xl border border-[var(--border)] p-8">
            <h3 className="text-xl font-serif font-bold text-[var(--heritage-brown)] mb-4">AI Behind the Scenes</h3>
            <ul className="space-y-2 text-[var(--muted)]">
              <li className="flex items-center"><span className="text-[var(--heritage-gold)] mr-2">✦</span> Smart pricing & recommendations</li>
              <li className="flex items-center"><span className="text-[var(--heritage-gold)] mr-2">✦</span> Story generation & narration</li>
              <li className="flex items-center"><span className="text-[var(--heritage-gold)] mr-2">✦</span> Semantic search</li>
              <li className="flex items-center"><span className="text-[var(--heritage-gold)] mr-2">✦</span> Translation & voice assistance</li>
            </ul>
          </div>

          <div className="bg-[var(--bg-2)]/80 rounded-3xl border border-[var(--border)] p-8">
            <h3 className="text-xl font-serif font-bold text-[var(--heritage-brown)] mb-4">Safety & Trust</h3>
            <ul className="space-y-2 text-[var(--muted)]">
              <li className="flex items-center"><span className="text-[var(--success)] mr-2">🛡️</span> Secure payments</li>
              <li className="flex items-center"><span className="text-[var(--success)] mr-2">🛡️</span> Transparent policies</li>
              <li className="flex items-center"><span className="text-[var(--success)] mr-2">🛡️</span> Direct seller communication</li>
              <li className="flex items-center"><span className="text-[var(--success)] mr-2">🛡️</span> Verified profiles</li>
            </ul>
          </div>
        </div>

      </div>
    </main>
  );
}
