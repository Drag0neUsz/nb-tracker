import type { CourseForm } from '../types'
import { isExamOccurrence, isLimitEnforced, remainingAbsences } from './attendance'

export type TileColor = 'green' | 'orange' | 'red' | 'gray'

const GRAY_STRIPE_BG =
  'repeating-linear-gradient(-45deg, var(--tile-gray-bg) 0 5px, var(--tile-gray-stripe) 5px 10px)'

export function tileColorFor(
  course: CourseForm | undefined,
  occurrenceId: string,
): TileColor {
  if (!course) return 'green'
  if (isExamOccurrence(course, occurrenceId)) return 'red'
  if (!isLimitEnforced(course)) return 'gray'
  if (remainingAbsences(course) <= 0) return 'orange'
  return 'green'
}

export const TILE_COLORS: Record<TileColor, { bg: string; border: string; text: string }> = {
  green: {
    bg: 'var(--tile-green-bg)',
    border: 'var(--tile-green-border)',
    text: 'var(--tile-green-text)',
  },
  orange: {
    bg: 'var(--tile-orange-bg)',
    border: 'var(--tile-orange-border)',
    text: 'var(--tile-orange-text)',
  },
  red: {
    bg: 'var(--tile-red-bg)',
    border: 'var(--tile-red-border)',
    text: 'var(--tile-red-text)',
  },
  gray: {
    bg: GRAY_STRIPE_BG,
    border: 'var(--tile-gray-border)',
    text: 'var(--tile-gray-text)',
  },
}
