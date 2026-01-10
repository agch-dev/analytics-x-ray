import { useState } from 'react';
import { useConfigStore } from '@src/stores';
import { Button } from '@src/components/ui/button';

export const ResetButton = () => {
  const reset = useConfigStore((state) => state.reset);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleReset = () => {
    if (showResetConfirm) {
      reset();
      setShowResetConfirm(false);
    } else {
      setShowResetConfirm(true);
      setTimeout(() => setShowResetConfirm(false), 3000);
    }
  };

  return (
    <div className="flex justify-end pt-4 border-t">
      <Button
        variant={showResetConfirm ? "destructive" : "secondary"}
        onClick={handleReset}
        aria-label={showResetConfirm ? "Confirm reset to default settings" : "Reset all settings to default values"}
      >
        {showResetConfirm ? 'Click again to confirm reset' : 'Reset to Defaults'}
      </Button>
    </div>
  );
};

