export default function SuccessStoriesPage() {
  return (
    <main className="container-custom py-16 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Voices of KalaMitra</h1>
      <section className="mb-8">
        <p className="mb-4">KalaMitra is not fully launched yet. Once it is live, your success stories will be shared here!</p>
      </section>
      <section className="mb-8">
        <a href="/auth/signup" className="px-4 py-2 bg-heritage-gold text-white rounded hover:bg-heritage-red transition mr-4">Share Your Story</a>
        <a href="/auth/signup" className="px-4 py-2 border border-heritage-gold text-heritage-gold rounded hover:bg-heritage-gold hover:text-white transition">Join KalaMitra</a>
      </section>
    </main>
  );
}
