import { useWindowDimensions } from 'react-native';

import { Breakpoints, MaxWideWidth, Spacing } from '@/constants/theme';

export interface Responsive {
  width: number;
  /** ≥ 768 pt: tablets / large screens get multi-column layouts. */
  isWide: boolean;
  /** ≥ 1100 pt */
  isXL: boolean;
  /** Horizontal page gutter. */
  gutter: number;
  /** Usable content width inside the gutters (capped at MaxWideWidth). */
  contentWidth: number;
  /** Grid helper: item width for `columns` columns separated by `gap`. */
  columnWidth: (columns: number, gap?: number) => number;
}

export function useResponsive(): Responsive {
  const { width } = useWindowDimensions();
  const isWide = width >= Breakpoints.tablet;
  const isXL = width >= Breakpoints.desktop;
  const gutter = isWide ? Spacing.four : Spacing.three;
  const contentWidth = Math.min(width, MaxWideWidth) - gutter * 2;
  return {
    width,
    isWide,
    isXL,
    gutter,
    contentWidth,
    columnWidth: (columns, gap = Spacing.three) => Math.floor((contentWidth - gap * (columns - 1)) / columns),
  };
}
