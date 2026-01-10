import { AlertCircleIcon, Refresh01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { Button } from './ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

/**
 * Generic error state component
 */
function ErrorStateBase({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  onRetry,
  retryLabel = 'Try again',
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-destructive/10 p-3">
              <HugeiconsIcon
                icon={AlertCircleIcon}
                size={32}
                className="text-destructive"
              />
            </div>
          </div>
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription className="mt-2">{message}</CardDescription>
        </CardHeader>
        {onRetry && (
          <CardContent className="flex justify-center">
            <Button onClick={onRetry} variant="outline" size="sm">
              <HugeiconsIcon icon={Refresh01Icon} size={16} className="mr-2" />
              {retryLabel}
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

/**
 * Error state for the Panel component
 *
 * Used when the entire panel crashes or fails to render
 */
export function PanelErrorState({ onRetry }: { onRetry?: () => void }) {
  const handleRetry = () => {
    // Reload the page/panel
    if (onRetry) {
      onRetry();
    } else {
      // Default: reload the DevTools panel
      window.location.reload();
    }
  };

  return (
    <div className="h-screen bg-background text-foreground flex flex-col items-center justify-center p-4">
      <ErrorStateBase
        title="Panel Error"
        message="The DevTools panel encountered an error and couldn't load. This may be due to corrupted data or a temporary issue. Try reloading the panel, or close and reopen DevTools if the problem persists."
        onRetry={handleRetry}
        retryLabel="Reload Panel"
      />
    </div>
  );
}

/**
 * Error state for the EventList component
 *
 * Used when the event list fails to render but the panel is still functional
 */
export function EventListErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <ErrorStateBase
        title="Event List Error"
        message="Failed to display events. The list may be corrupted or there was a rendering issue. Try clearing events or reloading the panel. If the problem persists, check the browser console for more details."
        onRetry={onRetry}
        retryLabel="Reload Events"
      />
    </div>
  );
}

/**
 * Error state for the EventDetailView component
 *
 * Used when event details fail to render
 */
export function EventDetailErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="border-t border-border bg-background/50 p-4">
      <div className="flex items-center gap-3 text-destructive">
        <HugeiconsIcon icon={AlertCircleIcon} size={20} />
        <div className="flex-1">
          <p className="text-sm font-medium">Failed to display event details</p>
          <p className="text-xs text-muted-foreground mt-1">
            The event data may be corrupted or in an unexpected format. Try
            switching to JSON view or collapsing and re-expanding this event. If
            the issue persists, the event may contain invalid data.
          </p>
        </div>
        {onRetry && (
          <Button
            onClick={onRetry}
            variant="ghost"
            size="sm"
            title="Retry loading event details"
          >
            <HugeiconsIcon icon={Refresh01Icon} size={16} />
          </Button>
        )}
      </div>
    </div>
  );
}
