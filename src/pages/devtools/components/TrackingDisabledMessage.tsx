import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon, Settings01Icon } from '@hugeicons/core-free-icons';
import { Button } from '@src/components/ui/button';
import Browser from 'webextension-polyfill';

interface TrackingDisabledMessageProps {
  domain: string;
}

export function TrackingDisabledMessage({ domain }: TrackingDisabledMessageProps) {
  const handleOpenOptions = () => {
    Browser.runtime.openOptionsPage();
  };

  return (
    <div className="bg-muted/50 border-b border-border p-4">
      <div className="flex items-center gap-3">
        <HugeiconsIcon
          icon={Cancel01Icon}
          size={20}
          className="text-muted-foreground shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            Tracking is disabled for <span className="font-mono text-primary">{domain}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Enable tracking in settings to capture Segment events from this domain
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleOpenOptions}
          className="shrink-0"
        >
          <HugeiconsIcon icon={Settings01Icon} size={16} className="mr-2" />
          Settings
        </Button>
      </div>
    </div>
  );
}

