"use client"

import { useEffect, useState } from 'react'
import { Trophy, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

type Leader = {
  user_id: string
  name: string | null
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
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null;

  const content = (
    <div
      className={
        (embedMode
          ? "bg-white dark:bg-gradient-to-br dark:from-[#18181b] dark:to-[#23232b] rounded-3xl w-full max-w-2xl p-4 sm:p-8 mx-auto shadow-xl border border-yellow-200/30 dark:border-yellow-400/10"
          : "bg-white dark:bg-gradient-to-br dark:from-[#18181b] dark:to-[#23232b] rounded-3xl w-full max-w-2xl p-4 sm:p-8 relative mx-auto shadow-2xl border border-yellow-200/30 dark:border-yellow-400/10") +
        " transition-all duration-500"
      }
    >
      {!embedMode && onClose && (
        <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-yellow-100 dark:bg-yellow-900 rounded-full hover:bg-yellow-200 dark:hover:bg-yellow-800 transition">
          <X className="w-5 h-5 text-yellow-600 dark:text-yellow-300" />
        </button>
      )}
      <div className="flex items-center space-x-3 mb-4">
        <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-yellow-300 to-orange-400 shadow-lg animate-bounce-slow">
          <Trophy className="w-7 h-7 text-yellow-700 dark:text-yellow-300" />
        </span>
        <h3 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-yellow-500 via-orange-400 to-pink-500 bg-clip-text text-transparent drop-shadow-lg tracking-tight">
          {t('leaderboard.title', { defaultValue: 'Leaderboard' })}
        </h3>
      </div>
      <p className="text-base sm:text-lg text-gray-700 dark:text-yellow-100 mb-6 font-medium">
        {t('leaderboard.desc', { defaultValue: 'Top buyers by MitraPoints (awarded for auction wins).' })}
      </p>
      {loading ? (
        <div className="text-center py-12 text-lg font-semibold text-yellow-600 dark:text-yellow-200 animate-pulse">Loading...</div>
      ) : (
        <ol className="space-y-4">
          {leaders.map((l, i) => (
            <li key={l.user_id}>
              <a
                href={`/profile/${l.user_id}`}
                className={
                  "flex items-center justify-between p-4 rounded-2xl shadow-md border border-yellow-100 dark:border-yellow-900 bg-gradient-to-br focus:outline-none focus:ring-2 focus:ring-yellow-400 hover:scale-[1.025] hover:shadow-xl transition-all duration-300 group " +
                  (i === 0
                    ? "from-yellow-200/80 to-orange-100/80 dark:from-yellow-900/60 dark:to-orange-900/60 scale-105"
                    : i === 1
                    ? "from-gray-100/80 to-yellow-100/80 dark:from-gray-800/60 dark:to-yellow-900/40"
                    : i === 2
                    ? "from-orange-100/80 to-pink-100/80 dark:from-orange-900/60 dark:to-pink-900/60"
                    : "from-white/80 to-yellow-50/80 dark:from-[#23232b]/80 dark:to-yellow-900/10")
                }
                tabIndex={0}
                aria-label={`View profile of ${l.name || l.user_id}`}
              >
                <div className="flex items-center space-x-3">
                  <div className={
                    "w-12 h-12 rounded-full flex items-center justify-center font-extrabold text-lg shadow-lg border-2 " +
                    (i === 0
                      ? "bg-gradient-to-br from-yellow-400 to-orange-400 border-yellow-400 text-white animate-crown"
                      : i === 1
                      ? "bg-gradient-to-br from-gray-300 to-yellow-200 border-gray-400 text-gray-800"
                      : i === 2
                      ? "bg-gradient-to-br from-orange-300 to-pink-300 border-orange-400 text-white"
                      : "bg-gradient-to-br from-yellow-100 to-white border-yellow-200 text-yellow-700 dark:text-yellow-200")
                  }>
                    {i + 1}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-base sm:text-lg text-gray-900 dark:text-yellow-100 flex items-center gap-2 group-hover:underline">
                      {l.name || l.user_id}
                      {i === 0 && (
                        <span className="ml-1 px-2 py-0.5 bg-yellow-400 text-white text-xs rounded-full font-bold animate-pulse">Top</span>
                      )}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-yellow-200">{l.auctionsWon} {t('leaderboard.auctionsWon', { defaultValue: 'auctions won' })}</span>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end">
                  <span className="font-extrabold text-lg text-orange-600 dark:text-yellow-200 flex items-center gap-1">
                    {l.mitraPoints}
                    <span className="text-xs font-bold bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-100 px-2 py-0.5 rounded-full ml-1">{t('leaderboard.pointsShort', { defaultValue: 'MP' })}</span>
                  </span>
                  {i === 0 && <span className="text-xs text-yellow-600 dark:text-yellow-200 font-bold mt-1">🏆 Champion</span>}
                </div>
              </a>
            </li>
          ))}
        </ol>
      )}
    </div>
  );

  if (embedMode) return content;
  return (
    <div className="fixed inset-0 bg-black/50 z-60 flex items-center justify-center p-4">
      {content}
    </div>
  );
}
