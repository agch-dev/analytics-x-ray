import { useState, useEffect } from 'react';

/**
 * Hook to detect if the current viewport is in horizontal layout
 * (wider than tall, typically for side-by-side DevTools panels)
 */
export function useHorizontalLayout(threshold = 1.2): boolean {
  const [isHorizontal, setIsHorizontal] = useState(false);

  useEffect(() => {
    const checkLayout = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setIsHorizontal(width / height > threshold);
    };

    // Check on mount
    checkLayout();

    // Listen for resize events
    window.addEventListener('resize', checkLayout);

    return () => {
      window.removeEventListener('resize', checkLayout);
    };
  }, [threshold]);

  return isHorizontal;
}

