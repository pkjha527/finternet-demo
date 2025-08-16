import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function to6(amountFloat: number): string {
  const v = Math.floor(amountFloat * 1_000_000)
  return String(v)
}
