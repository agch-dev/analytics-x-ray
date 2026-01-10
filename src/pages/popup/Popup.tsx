import { Refresh01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Browser from 'webextension-polyfill';

import { Logo } from '@src/components/Logo';
import { Badge } from '@src/components/ui/badge';
import { Button } from '@src/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@src/components/ui/card';
import { isDevMode } from '@src/lib/utils';
import { getFormattedVersion } from '@src/lib/version';

export default function Popup() {
  const handleOpenOptions = () => {
    Browser.runtime.openOptionsPage();
  };

  const handleReloadExtension = () => {
    // Use chrome.runtime.reload() directly as it's not in webextension-polyfill
    if (
      typeof chrome !== 'undefined' &&
      chrome.runtime &&
      chrome.runtime.reload
    ) {
      chrome.runtime.reload();
    } else {
      // Fallback: open extensions page
      window.open('chrome://extensions/', '_blank');
    }
  };

  return (
    <div className="min-h-[400px] w-[380px] bg-background text-foreground">
      <Card className="border-0 bg-card shadow-none">
        <CardHeader className="pb-4 text-center">
          <div className="mb-2 flex flex-col items-center gap-3">
            <Logo className="pointer-events-none h-16 w-16" size={64} />
            <div>
              <CardTitle className="text-2xl font-bold">
                Analytics X-Ray
              </CardTitle>
              <CardDescription className="mt-1 text-sm">
                Inspect Segment analytics events in real-time
              </CardDescription>
            </div>
          </div>
          <Badge variant="secondary" className="mx-auto w-fit">
            {getFormattedVersion()}
          </Badge>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">
              Quick Actions
            </h3>
            <div className="space-y-2">
              <Button
                onClick={handleOpenOptions}
                className="w-full"
                variant="default"
              >
                Extension Settings
              </Button>
              {isDevMode() && (
                <Button
                  onClick={handleReloadExtension}
                  className="w-full"
                  variant="outline"
                >
                  <HugeiconsIcon
                    icon={Refresh01Icon}
                    size={18}
                    className="mr-2"
                  />
                  Reload Extension
                </Button>
              )}
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <h3 className="mb-2 text-sm font-semibold text-foreground">
              How to Use
            </h3>
            <ol
              className={`
              list-inside list-decimal space-y-1.5 text-xs text-muted-foreground
            `}
            >
              <li>Open your browser&apos;s DevTools (F12)</li>
              <li>Navigate to the &quot;Analytics X-Ray&quot; panel</li>
              <li>View Segment events as they fire on the page</li>
              <li>Inspect event payloads and properties</li>
            </ol>
          </div>

          <div className="pt-2">
            <p className="text-center text-xs text-muted-foreground">
              Intercepting Segment analytics events on all pages
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
