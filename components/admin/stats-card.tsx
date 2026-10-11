'use client'

import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type Tone = 'neutral' | 'positive' | 'warning' | 'danger'

const TONE_STYLES: Record<Tone, string> = {
  neutral: 'border-border bg-secondary/60 text-foreground',
  positive: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400',
  warning: 'border-amber-500/20 bg-amber-500/10 text-amber-400',
  danger: 'border-red-500/20 bg-red-500/10 text-red-400',
}

export function StatsCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'neutral',
  index = 0,
  isLoading = false,
}: {
  label: string
  value: number | string
  hint?: string
  icon: LucideIcon
  tone?: Tone
  /** Posicion en la rejilla: escalona la animacion de entrada. */
  index?: number
  isLoading?: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: 'easeOut' }}
      className="group rounded-xl border border-border bg-card/60 p-4 transition-colors duration-200 hover:border-border/80 hover:bg-card sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </p>
        <span
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-lg border',
            TONE_STYLES[tone],
          )}
        >
          <Icon className="size-4" />
        </span>
      </div>

      <p className="mt-3 text-3xl font-bold tabular-nums tracking-tight text-foreground">
        {isLoading ? (
          <span className="inline-block h-8 w-12 animate-pulse rounded bg-secondary align-middle" />
        ) : (
          value
        )}
      </p>

      {hint && (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      )}
    </motion.div>
  )
}
