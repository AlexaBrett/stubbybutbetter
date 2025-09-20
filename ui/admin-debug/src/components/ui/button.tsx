import * as React from 'react'
import { clsx } from 'clsx'

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
  default: 'bg-sky-800 border-sky-700 text-white hover:bg-sky-700',
  secondary: 'bg-neutral-800 border-neutral-700 text-neutral-100 hover:bg-neutral-700',
  destructive: 'bg-red-700 border-red-600 text-white hover:bg-red-600',
  outline: 'bg-transparent border-neutral-700 text-neutral-100 hover:bg-neutral-800',
  ghost: 'bg-transparent border-transparent hover:bg-neutral-800',
  link: 'bg-transparent border-transparent text-sky-400 underline-offset-4 hover:underline'
}

const sizes: Record<NonNullable<ButtonProps['size']>, string> = {
  default: 'h-9 px-3 py-1 rounded-md',
  sm: 'h-8 px-2 py-1 rounded-md text-sm',
  lg: 'h-10 px-4 py-2 rounded-md text-base',
  icon: 'h-9 w-9 p-0 grid place-items-center rounded-md'
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'secondary', size = 'default', ...props }, ref) => (
    <button
      ref={ref}
      className={clsx('border transition-colors cursor-pointer', variants[variant], sizes[size], className)}
      {...props}
    />
  )
)
Button.displayName = 'Button'