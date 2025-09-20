import * as React from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'
import { clsx } from 'clsx'

export const Select = SelectPrimitive.Root
export const SelectValue = SelectPrimitive.Value

export const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={clsx('inline-flex items-center justify-between gap-2 px-3 py-1 h-9 rounded-md border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 min-w-[8rem]', className)}
    {...props}
  >
    {children}
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = 'SelectTrigger'

export function SelectContent ({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Content> & { children?: React.ReactNode }) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content className={clsx('z-50 min-w-[8rem] overflow-hidden rounded border border-neutral-700 bg-neutral-900 text-neutral-100 shadow-md', className)} {...props}>
        <SelectPrimitive.Viewport className="p-1">
          {children}
        </SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

export function SelectItem ({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item className={clsx('relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-neutral-800', className)} {...props}>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
}