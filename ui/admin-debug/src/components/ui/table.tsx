import * as React from 'react'
import { clsx } from 'clsx'

export function Table ({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return <table className={clsx('w-full border-collapse', className)} {...props} />
}
export function TableHeader ({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={clsx('', className)} {...props} />
}
export function TableBody ({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={clsx('', className)} {...props} />
}
export function TableRow ({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={clsx('border-b border-neutral-800 hover:bg-neutral-800', className)} {...props} />
}
export function TableHead ({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={clsx('text-left bg-neutral-800 text-sky-400 px-3 py-2 border border-neutral-700', className)} {...props} />
}
export function TableCell ({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={clsx('px-3 py-2 border border-neutral-800', className)} {...props} />
}
