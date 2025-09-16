import Leaderboard from '../../components/Leaderboard'

export default function LeaderboardPage() {
  return (
    <main className="container-custom py-10">
      <h1 className="text-4xl font-bold mb-6">Leaderboard</h1>
      <Leaderboard embedMode />
    </main>
  )
}
