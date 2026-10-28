import { useEffect, useState } from 'react';

/** Keeps the floating create action available after the primary welcome action leaves view. */
export function useWelcomeVisibility(enabled: boolean): boolean {
  const [isVisible, setIsVisible] = useState(enabled);
  useEffect(() => {
    if (!enabled) return;
    const welcome = document.querySelector('[data-home-welcome]');
    if (!welcome || typeof IntersectionObserver === 'undefined') {
      setIsVisible(false);
      return;
    }
    const observer = new IntersectionObserver(entries => setIsVisible(entries[0]?.isIntersecting ?? false));
    observer.observe(welcome);
    return () => observer.disconnect();
  }, [enabled]);
  return enabled && isVisible;
}
