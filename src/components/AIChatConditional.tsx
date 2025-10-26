"use client"
import AIShoppingChat from './AIShoppingChat';
import { usePathname } from 'next/navigation';

export default function AIChatConditional() {
  const pathname = usePathname();
  // Hide on home, public profile, public stall, and DM pages
  if (
    pathname === '/' ||
    pathname.startsWith('/profile/') ||
    pathname.startsWith('/stall/') ||
    pathname.startsWith('/dm')
  ) {
    return null;
  }
  return <AIShoppingChat />;
}
