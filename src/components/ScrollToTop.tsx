import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Reset the page scroll to the top on every route change. With the old
// fixed-height explorer removed, each page is normal document flow, so a route
// change should behave like a fresh page load rather than keeping the previous
// scroll offset.
export function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);
  return null;
}
