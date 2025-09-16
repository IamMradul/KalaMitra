
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
    <main className="container-custom py-10 max-w-xl mx-auto">
      <div className="flex flex-col items-center bg-white dark:bg-[#18181b] rounded-3xl shadow-xl p-8 border border-yellow-200/30 dark:border-yellow-400/10">
        <div className="w-28 h-28 rounded-full bg-gradient-to-br from-yellow-200 to-orange-200 flex items-center justify-center mb-4 border-4 border-yellow-400 overflow-hidden">
          {profile.profile_image ? (
            <img src={profile.profile_image} alt="avatar" className="w-full h-full object-cover rounded-full" />
          ) : (
            <span className="text-4xl font-bold text-yellow-700">{profile.name?.[0] || '?'}</span>
          )}
        </div>
        <h2 className="text-2xl font-extrabold mb-1 bg-gradient-to-r from-yellow-500 via-orange-400 to-pink-500 bg-clip-text text-transparent drop-shadow-lg">{profile.name || 'User'}</h2>
        <div className="flex items-center gap-2 mb-4">
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-gradient-to-r from-yellow-300 via-orange-200 to-pink-200 dark:from-yellow-900 dark:via-orange-900 dark:to-pink-900 shadow font-bold text-yellow-800 dark:text-yellow-100 text-base">
            <Trophy className="w-5 h-5 mr-1 text-yellow-500" />
            {mitraPoints}
            <span className="ml-1 text-xs font-semibold uppercase tracking-wide">MitraPoints</span>
          </span>
        </div>
        <div className="w-full max-w-md mx-auto mb-2">
          <div className="font-semibold text-gray-800 dark:text-yellow-100 text-center mb-1">Description</div>
          <p className="text-gray-700 dark:text-yellow-100 text-center mb-4 min-h-[2em]">{profile.bio || <span className="text-gray-400">No description provided.</span>}</p>
        </div>
        {/* Add more public info if needed */}
      </div>
    </main>
  );
}



export const dynamic = 'force-dynamic';
