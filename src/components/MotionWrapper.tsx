'use client'

import React from 'react'
import { motion } from 'framer-motion'

interface MotionWrapperProps {
  children: React.ReactNode
  className?: string
  delay?: number
}

interface MotionDivProps {
  children: React.ReactNode
  className?: string
  delay?: number
}

export function MotionWrapper({ children, className = '', delay = 0 }: MotionWrapperProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function MotionDiv({ children, className = '', delay = 0 }: MotionDivProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
