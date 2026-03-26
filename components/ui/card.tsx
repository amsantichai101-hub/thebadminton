
import * as React from 'react'
import { cn } from './utils'
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) { return <div className={cn('rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900', className)} {...props} /> }
export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) { return <div className={cn('flex flex-col space-y-1.5 p-4', className)} {...props} /> }
export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) { return <div className={cn('p-4', className)} {...props} /> }
export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) { return <div className={cn('flex items-center p-4 pt-0', className)} {...props} /> }
