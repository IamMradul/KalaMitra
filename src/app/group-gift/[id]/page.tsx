'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import GroupGiftContribution from '@/components/GroupGiftContribution'

export default function GroupGiftPage() {
  const params = useParams()
  const groupGiftId = params.id as string

  return (
    <div className="min-h-screen bg-[var(--bg-2)] py-8 transition-colors duration-300">
      <GroupGiftContribution groupGiftId={groupGiftId} />
    </div>
  )
}
