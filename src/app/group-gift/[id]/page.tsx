'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import GroupGiftContribution from '@/components/GroupGiftContribution'

export default function GroupGiftPage() {
  const params = useParams()
  const groupGiftId = params.id as string

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <GroupGiftContribution groupGiftId={groupGiftId} />
    </div>
  )
}
