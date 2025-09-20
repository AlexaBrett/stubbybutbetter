import * as React from 'react'
import * as AccordionPrimitive from '@radix-ui/react-accordion'
import { clsx } from 'clsx'

export const Accordion = AccordionPrimitive.Root

export function AccordionItem ({ className, ...props }: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return <AccordionPrimitive.Item className={clsx('border border-neutral-800 rounded', className)} {...props} />
}

export const AccordionTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Header>
    <AccordionPrimitive.Trigger
      ref={ref}
      className={clsx('w-full text-left px-3 py-2 bg-neutral-900 hover:bg-neutral-800 transition-colors group', className)}
      {...props}
    >
      {children}
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
))
AccordionTrigger.displayName = 'AccordionTrigger'

export const AccordionContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className={clsx('overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up', className)}
    {...props}
  >
    <div className="px-3 py-2">
      {children}
    </div>
  </AccordionPrimitive.Content>
))
AccordionContent.displayName = 'AccordionContent'