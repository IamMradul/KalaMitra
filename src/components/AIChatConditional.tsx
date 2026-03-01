"use client"
import AIShoppingChat from './AIShoppingChat';
import { usePathname } from 'next/navigation';

export default function AIChatConditional() {
  const pathname = usePathname();
  // Hide on home, public profile, public stall, DM, and leaderboard pages
  if (
    pathname === '/' ||
    pathname.startsWith('/profile/') ||
    pathname.startsWith('/stall/') ||
    pathname.startsWith('/dm') ||
    pathname === '/leaderboard'
  ) {
    return null;
  }
  return <AIShoppingChat />;
}
