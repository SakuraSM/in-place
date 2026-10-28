/** Shared layout measurements. Web breakpoints are applied by its Tailwind adapter. */
export const layout = {
  pageGutter: { mobile: 20, desktop: 40 },
  pageGap: { mobile: 20, desktop: 24 },
  panelPadding: { mobile: 18, desktop: 24 },
  sidebar: { expanded: 224, collapsed: 72 },
  maxContentWidth: 1200,
  maxFormWidth: 760,
  mobileNavigationHeight: 64,
  mapCanvas: { mobile: 330, desktop: 390 },
} as const;
