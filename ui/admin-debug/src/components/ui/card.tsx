import * as React from 'react'
import { clsx } from 'clsx'

export function Card ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx('border border-neutral-800 rounded-lg', className)} {...props} />
}
export function CardHeader ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx('bg-neutral-800 px-4 py-3 font-semibold', className)} {...props} />
}
export function CardContent ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx('p-4', className)} {...props} />
}
