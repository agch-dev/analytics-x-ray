import { Button } from '@src/components/ui/button';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowDown01Icon } from '@hugeicons/core-free-icons';
import { cn } from '@src/lib/utils';

interface ScrollToBottomButtonProps {
  isVisible: boolean;
  onClick: () => void;
}

export function ScrollToBottomButton({ isVisible, onClick }: ScrollToBottomButtonProps) {
  return (
    <div
      className={cn(
        "fixed bottom-20 right-4 z-50 transition-opacity duration-200",
        isVisible ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      )}
    >
      <Button
        onClick={onClick}
        size="lg"
        className="rounded-full shadow-lg h-12 w-12 p-0"
        title="Scroll to latest"
      >
        <HugeiconsIcon icon={ArrowDown01Icon} size={20} />
      </Button>
    </div>
  );
}

