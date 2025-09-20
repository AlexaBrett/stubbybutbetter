import * as React from 'react'
import { clsx } from 'clsx'

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline'
}

const variants: Record<NonNullable<BadgeProps['variant']>, string> = {
  default: 'bg-emerald-600 text-white',
  secondary: 'bg-neutral-700 text-neutral-100',
  destructive: 'bg-red-700 text-white',
  outline: 'border border-neutral-600 text-neutral-100'
}

export function Badge ({ className, variant = 'secondary', ...props }: BadgeProps) {
  return (
    <span className={clsx('inline-block text-xs px-2 py-0.5 rounded', variants[variant], className)} {...props} />
  )
}