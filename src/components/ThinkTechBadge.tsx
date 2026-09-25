// © ThinkTech — KalaMitra — 2026
import Link from 'next/link';
import { Sparkles } from 'lucide-react';

export default function ThinkTechBadge() {
  return (
    <Link 
      href="/creators"
      className="fixed bottom-6 left-6 z-50 group flex items-center gap-2 bg-[var(--bg-2)]/90 backdrop-blur-md border border-[var(--heritage-gold)]/30 px-4 py-2 rounded-full shadow-lg hover:shadow-[var(--heritage-gold)]/20 hover:border-[var(--heritage-gold)] transition-all duration-300"
      aria-label="Made with ThinkTech - See creators"
    >
      <Sparkles className="w-4 h-4 text-[var(--heritage-gold)] group-hover:animate-pulse" />
      <span className="text-sm font-medium text-[var(--text)]">Made with ThinkTech</span>
    </Link>
  );
}
