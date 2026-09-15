import React, { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    // 1. Force manual scroll restoration to prevent browser from restoring previous scroll position
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    const resetScrollPosition = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
      document.body.scrollTop = 0;
      document.documentElement.scrollTop = 0;
    };

    // Immediate scroll reset
    resetScrollPosition();

    // Secondary frame reset to catch layout updates & async component rendering
    const rafId = requestAnimationFrame(resetScrollPosition);
    const timer1 = setTimeout(resetScrollPosition, 50);
    const timer2 = setTimeout(resetScrollPosition, 150);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [pathname]);

  return null;
};
