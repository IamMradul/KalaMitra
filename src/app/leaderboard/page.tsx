'use client'
import Leaderboard from '../../components/Leaderboard'

import { useTranslation } from 'react-i18next';

export default function LeaderboardPage() {
  const { t } = useTranslation();
  return (
    <main className="container-custom py-10">
      <h1 className="text-4xl font-bold mb-6"></h1>
      <Leaderboard embedMode />
    </main>
  )
}
