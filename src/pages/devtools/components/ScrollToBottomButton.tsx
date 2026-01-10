import { ArrowDown01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { Button } from '@src/components/ui/button';
import { cn } from '@src/lib/utils';

interface ScrollToBottomButtonProps {
  isVisible: boolean;
  onClick: () => void;
}

export function ScrollToBottomButton({
  isVisible,
  onClick,
}: Readonly<ScrollToBottomButtonProps>) {
  return (
    <div
      className={cn(
        'fixed right-4 bottom-20 z-50 transition-opacity duration-200',
        isVisible
          ? 'pointer-events-auto opacity-100'
          : 'pointer-events-none opacity-0'
      )}
    >
      <Button
        onClick={onClick}
        size="lg"
        className="h-12 w-12 p-0 shadow-lg"
        title="Scroll to latest"
        aria-label="Scroll to bottom to view latest events"
      >
        <HugeiconsIcon icon={ArrowDown01Icon} size={20} />
      </Button>
    </div>
  );
}
