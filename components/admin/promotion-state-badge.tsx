import { Ban, CircleCheck, Clock, Hourglass } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PromotionState } from '@/lib/admin/types'

const STATES: Record<
  PromotionState,
  { label: string; className: string; icon: typeof CircleCheck }
> = {
  running: {
    label: 'Aplicandose',
    className: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400',
    icon: CircleCheck,
  },
  scheduled: {
    label: 'Programada',
    className: 'border-sky-500/20 bg-sky-500/10 text-sky-400',
    icon: Clock,
  },
  expired: {
    label: 'Caducada',
    className: 'border-border bg-muted text-muted-foreground',
    icon: Hourglass,
  },
  disabled: {
    label: 'Desactivada',
    className: 'border-border bg-muted text-muted-foreground',
    icon: Ban,
  },
}

/** Estado de una promocion: aplicandose, programada, caducada o desactivada. */
export function PromotionStateBadge({
  state,
  className,
}: {
  state: PromotionState
  className?: string
}) {
  const config = STATES[state]
  const Icon = config.icon

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium',
        config.className,
        className,
      )}
    >
      <Icon className="size-3" />
      {config.label}
    </span>
  )
}

export const PROMOTION_STATE_LABELS: Record<PromotionState, string> = {
  running: STATES.running.label,
  scheduled: STATES.scheduled.label,
  expired: STATES.expired.label,
  disabled: STATES.disabled.label,
}
