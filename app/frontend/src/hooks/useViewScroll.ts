import { useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { readUsuario } from '../auth/sessionStore';

export function useViewScroll() {
  const ref = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const key = `vista:${readUsuario()?.id ?? 'publico'}:scroll:${pathname}`;
    let target = 0;
    try { target = Number(sessionStorage.getItem(key)) || 0; } catch { /* Sin persistencia. */ }
    let observer: ResizeObserver | null = null;
    const restore = () => {
      element.scrollTop = target;
      if (element.scrollTop === target) observer?.disconnect();
    };
    restore();
    observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(restore);
    if (target > element.scrollTop) observer?.observe(element.lastElementChild ?? element);
    const stop = () => observer?.disconnect();
    const save = () => { try { sessionStorage.setItem(key, String(element.scrollTop)); } catch { /* Sin persistencia. */ } };
    element.addEventListener('wheel', stop, { passive: true });
    element.addEventListener('touchstart', stop, { passive: true });
    element.addEventListener('keydown', stop);
    element.addEventListener('pointerdown', stop);
    element.addEventListener('scroll', save);
    return () => {
      observer?.disconnect();
      element.removeEventListener('wheel', stop);
      element.removeEventListener('touchstart', stop);
      element.removeEventListener('keydown', stop);
      element.removeEventListener('pointerdown', stop);
      element.removeEventListener('scroll', save);
    };
  }, [pathname]);
  return ref;
}
