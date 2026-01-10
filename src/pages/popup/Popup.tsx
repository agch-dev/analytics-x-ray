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
    <div className="w-[380px] min-h-[400px] bg-background text-foreground">
      <Card className="border-0 shadow-none bg-card">
        <CardHeader className="text-center pb-4">
          <div className="flex flex-col items-center gap-3 mb-2">
            <Logo className="h-16 w-16 pointer-events-none" size={64} />
            <div>
              <CardTitle className="text-2xl font-bold">
                Analytics X-Ray
              </CardTitle>
              <CardDescription className="text-sm mt-1">
                Inspect Segment analytics events in real-time
              </CardDescription>
            </div>
          </div>
          <Badge variant="secondary" className="w-fit mx-auto">
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

          <div className="pt-4 border-t border-border">
            <h3 className="text-sm font-semibold text-foreground mb-2">
              How to Use
            </h3>
            <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
              <li>Open your browser&apos;s DevTools (F12)</li>
              <li>Navigate to the &quot;Analytics X-Ray&quot; panel</li>
              <li>View Segment events as they fire on the page</li>
              <li>Inspect event payloads and properties</li>
            </ol>
          </div>

          <div className="pt-2">
            <p className="text-xs text-muted-foreground text-center">
              Intercepting Segment analytics events on all pages
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
