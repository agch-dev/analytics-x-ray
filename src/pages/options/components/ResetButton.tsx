import { useState, useRef, useEffect } from 'react';

import { Button } from '@src/components/ui/button';
import { useConfigStore } from '@src/stores';

export const ResetButton = () => {
  const reset = useConfigStore((state) => state.reset);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
      }
    };
  }, []);

  const handleReset = () => {
    if (showResetConfirm) {
      reset();
      setShowResetConfirm(false);
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
        resetTimeoutRef.current = null;
      }
    } else {
      setShowResetConfirm(true);
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
      }
      resetTimeoutRef.current = setTimeout(() => {
        setShowResetConfirm(false);
        resetTimeoutRef.current = null;
      }, 3000);
    }
  };

  return (
    <div className="flex justify-end border-t pt-4">
      <Button
        variant={showResetConfirm ? 'destructive' : 'secondary'}
        onClick={handleReset}
        aria-label={
          showResetConfirm
            ? 'Confirm reset to default settings'
            : 'Reset all settings to default values'
        }
      >
        {showResetConfirm
          ? 'Click again to confirm reset'
          : 'Reset to Defaults'}
      </Button>
    </div>
  );
};
