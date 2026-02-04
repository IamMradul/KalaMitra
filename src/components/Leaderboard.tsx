"use client"

import { useEffect, useState } from 'react'
import { Trophy, X, Crown, Medal, Award, User } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Link from 'next/link'

type Leader = {
  user_id: string
  name: string | null
  profile_image?: string | null
  mitraPoints: number
  auctionsWon: number
}

type LeaderboardProps = {
  open?: boolean;
  onClose?: () => void;
  embedMode?: boolean;
};

export default function Leaderboard({ open = true, onClose, embedMode = false }: LeaderboardProps) {
  const { t } = useTranslation()
  const [leaders, setLeaders] = useState<Leader[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return;
    fetchData();
  }, [open]);

  async function fetchData() {
    setLoading(true)
    try {
      const res = await fetch('/api/leaderboard')
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setLeaders(data.leaders || [])
    } catch (err) {
      console.error('leaderboard fetch failed', err)
      // Fallback data for preview if API fails
      setLeaders([
        { user_id: '1', name: 'Priya Sharma', mitraPoints: 12500, auctionsWon: 15, profile_image: null },
        { user_id: '2', name: 'Rahul Verma', mitraPoints: 9800, auctionsWon: 8, profile_image: null },
        { user_id: '3', name: 'Amit Patel', mitraPoints: 8500, auctionsWon: 6, profile_image: null },
        { user_id: '4', name: 'Sneha Gupta', mitraPoints: 6200, auctionsWon: 4, profile_image: null },
        { user_id: '5', name: 'Vikram Singh', mitraPoints: 5400, auctionsWon: 3, profile_image: null },
      ])
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null;

  const content = (
    <div
      className={
        (embedMode
          ? "w-full max-w-2xl mx-auto"
          : "fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl p-4 sm:p-8")
      }
    >
      <div className={`
        relative overflow-hidden rounded-3xl transition-all duration-300
        bg-[var(--bg-2)] border border-[var(--heritage-gold)]/20 shadow-2xl
        ${!embedMode ? 'p-6 md:p-8' : 'p-6'}
      `}>

        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[var(--heritage-gold)]/10 to-transparent rounded-full blur-2xl -mr-32 -mt-32 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-[var(--heritage-red)]/5 to-transparent rounded-full blur-2xl -ml-32 -mb-32 pointer-events-none"></div>

        {!embedMode && onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-[var(--muted)]/10 transition-colors text-[var(--muted)] hover:text-[var(--text)]"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="flex flex-col items-center text-center mb-8 relative z-10">
          <div className="w-16 h-16 mb-4 rounded-full bg-gradient-to-br from-[var(--heritage-gold)] to-[var(--heritage-red)] flex items-center justify-center shadow-lg shadow-[var(--heritage-gold)]/20">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-3xl font-bold font-serif bg-gradient-to-r from-[var(--heritage-gold)] to-[var(--heritage-red)] bg-clip-text text-transparent mb-2">
            {t('leaderboard.title', { defaultValue: 'Leaderboard' })}
          </h3>
          <p className="text-[var(--muted)]">
            {t('leaderboard.desc', { defaultValue: 'Top contributors to the KalaMitra community' })}
          </p>
        </div>

        {loading ? (
          <div className="space-y-4 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-[var(--muted)]/10 rounded-xl w-full"></div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {leaders.map((leader, index) => {
              // Rank Styles
              let rankStyle = "bg-[var(--bg-1)] border-[var(--border)]";
              let rankIcon = null;
              let rankNumberStyle = "text-[var(--muted)] bg-[var(--bg-2)] border-[var(--border)]";

              if (index === 0) {
                rankStyle = "bg-gradient-to-r from-[var(--heritage-gold)]/10 to-[var(--heritage-red)]/5 border-[var(--heritage-gold)]/40 shadow-soft";
                rankIcon = <Crown className="w-5 h-5 text-[var(--heritage-gold)]" fill="currentColor" />;
                rankNumberStyle = "bg-[var(--heritage-gold)] text-white border-[var(--heritage-gold)]";
              } else if (index === 1) {
                rankStyle = "bg-gradient-to-r from-gray-100 to-gray-50 border-gray-300/50 dark:from-gray-800/30 dark:to-gray-900/30 dark:border-gray-700";
                rankIcon = <Medal className="w-5 h-5 text-gray-400" fill="currentColor" />;
                rankNumberStyle = "bg-gray-400 text-white border-gray-400";
              } else if (index === 2) {
                rankStyle = "bg-gradient-to-r from-orange-50 to-orange-50/50 border-orange-200/50 dark:from-orange-900/20 dark:to-orange-900/10 dark:border-orange-800/30";
                rankIcon = <Award className="w-5 h-5 text-orange-400" fill="currentColor" />;
                rankNumberStyle = "bg-orange-400 text-white border-orange-400";
              }

              return (
                <Link
                  href={`/profile/${leader.user_id}`}
                  key={leader.user_id}
                  className={`
                    relative flex items-center p-4 rounded-xl border transition-all duration-300 hover:scale-[1.01] hover:shadow-md cursor-pointer block
                    ${rankStyle}
                  `}
                >
                  {/* Rank Indicator */}
                  <div className={`
                    w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full font-bold text-lg border-2 z-10
                    ${rankNumberStyle}
                  `}>
                    {index + 1}
                  </div>

                  {/* Profile Picture */}
                  <div className="ml-4 flex-shrink-0 relative">
                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[var(--heritage-gold)] bg-[var(--bg-3)]">
                      {leader.profile_image ? (
                        <img src={leader.profile_image} alt={leader.name || 'User'} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--heritage-gold)] to-[var(--heritage-red)] text-white font-bold text-lg">
                          {leader.name ? leader.name.charAt(0).toUpperCase() : <User className="w-6 h-6" />}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="ml-4 flex-grow min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className={`font-bold truncate text-base sm:text-lg ${index < 3 ? 'text-[var(--text)]' : 'text-[var(--muted)]'}`}>
                        {leader.name || `User ${leader.user_id.substring(0, 6)}`}
                      </h4>
                      {rankIcon}
                    </div>
                    <div className="flex items-center text-xs text-[var(--muted)] mt-0.5">
                      <span>{leader.auctionsWon} {t('leaderboard.auctionsWon', { defaultValue: 'auctions won' })}</span>
                    </div>
                  </div>

                  <div className="text-right pl-4">
                    <div className="font-bold text-lg bg-gradient-to-r from-[var(--heritage-gold)] to-[var(--heritage-red)] bg-clip-text text-transparent">
                      {leader.mitraPoints.toLocaleString()}
                    </div>
                    <div className="text-xs text-[var(--muted)] font-medium">MitraPoints</div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  if (embedMode) return content;

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose}></div>
      {content}
    </div>
  );
}
