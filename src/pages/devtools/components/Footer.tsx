import { HeartCheckIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useState } from 'react';

import { Button } from '@src/components/ui/button';

import { SupportModal } from './SupportModal';

interface FooterProps {
  tabId: number;
  isListening?: boolean;
}

export function Footer({ tabId, isListening = true }: FooterProps) {
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);

  return (
    <>
      <footer className="shrink-0 px-4 py-1.5 border-t border-border bg-card/50 flex items-center justify-between text-xs text-muted-foreground">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsSupportModalOpen(true)}
          className="h-auto py-1 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <HugeiconsIcon
            icon={HeartCheckIcon}
            size={14}
            className="mr-1.5 text-rose-500"
          />
          Support Me
        </Button>

        <div className="flex items-center gap-3">
          <div className="h-4 w-px bg-border" />
          <span>Tab {tabId}</span>
          <span className="flex items-center gap-1.5">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isListening ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            {isListening ? 'Listening' : 'Paused'}
          </span>
        </div>
      </footer>

      <SupportModal
        open={isSupportModalOpen}
        onOpenChange={setIsSupportModalOpen}
      />
    </>
  );
}
