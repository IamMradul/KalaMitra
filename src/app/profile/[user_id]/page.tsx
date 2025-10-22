
import { notFound } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { Trophy } from 'lucide-react';

async function getProfileData(user_id: string) {
  // Fetch user profile from Supabase
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user_id)
    .single();
  if (error || !profile) return { profile: null, mitraPoints: 0 };
  // Dynamically calculate MitraPoints (10 per auction win)
  const { data: auctions } = await supabase
    .from('auctions')
    .select('id')
    .eq('winner_id', user_id);
  const mitraPoints = auctions && Array.isArray(auctions) ? auctions.length * 10 : 0;
  return { profile, mitraPoints };
}












export default async function Page({ params }: { params: Promise<{ user_id: string }> }) {
  const { user_id } = await params;
  const { profile, mitraPoints } = await getProfileData(user_id);
  if (!profile) return notFound();
  return (
    <main className="min-h-screen heritage-bg relative overflow-hidden">
      {/* Traditional Indian Background Pattern */}
      <div className="absolute inset-0 indian-pattern opacity-5"></div>
      
      {/* Floating Decorative Elements - Theme Aware */}
      <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-[var(--saffron)]/20 to-[var(--turquoise)]/20 rounded-full mix-blend-multiply filter blur-2xl animate-float"></div>
      <div className="absolute bottom-20 right-10 w-40 h-40 bg-gradient-to-br from-[var(--maroon)]/20 to-[var(--royal-blue)]/20 rounded-full mix-blend-multiply filter blur-2xl animate-float" style={{animationDelay: '2s'}}></div>
      
      <div className="container-custom py-10 max-w-xl mx-auto relative z-10">
        <div className="card-glass flex flex-col items-center rounded-3xl shadow-2xl p-8 hover-lift">
          {/* Enhanced Avatar with Traditional Frame - Theme Aware */}
          <div className="relative group mb-6">
            <div className="avatar-indian-frame">
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-[var(--saffron)] via-[var(--turquoise)] to-[var(--maroon)] flex items-center justify-center border-2 border-[var(--border)] overflow-hidden">
                {profile.profile_image ? (
                  <img src={profile.profile_image} alt="avatar" className="w-full h-full object-cover rounded-full" />
                ) : (
                  <span className="text-4xl font-bold text-white">{profile.name?.[0] || '?'}</span>
                )}
              </div>
            </div>
          </div>
          
          <h2 className="text-2xl font-extrabold mb-1 bg-gradient-to-r from-[var(--saffron)] via-[var(--turquoise)] to-[var(--maroon)] bg-clip-text text-transparent drop-shadow-lg">{profile.name || 'User'}</h2>
          
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-gradient-to-r from-[var(--trust-gold)] to-[var(--saffron)] shadow-lg font-bold text-white text-base border border-white/20">
              <Trophy className="w-5 h-5 mr-1" />
              {mitraPoints}
              <span className="ml-1 text-xs font-semibold uppercase tracking-wide">MitraPoints</span>
            </span>
          </div>
          
          <div className="w-full max-w-md mx-auto mb-2">
            <div className="font-semibold text-[var(--text)] text-center mb-1">Description</div>
            <p className="text-[var(--muted)] text-center mb-4 min-h-[2em]">{profile.bio || <span className="text-[var(--muted)]/60 italic">No description provided.</span>}</p>
          </div>
        </div>
      </div>
    </main>
  );
}



export const dynamic = 'force-dynamic';
