import Browser from 'webextension-polyfill';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@src/components/ui/card';
import { Button } from '@src/components/ui/button';
import { Badge } from '@src/components/ui/badge';
import { getFormattedVersion } from '@src/lib/version';

export default function Popup() {
  const handleOpenOptions = () => {
    Browser.runtime.openOptionsPage();
  };

  return (
    <div className="w-[380px] min-h-[400px] bg-background text-foreground">
      <Card className="border-0 shadow-none bg-card">
          <CardHeader className="text-center pb-4">
            <div className="flex flex-col items-center gap-3 mb-2">
              <img 
                src="icons/icon32.png" 
                className="h-16 w-16 pointer-events-none" 
                alt="Analytics X-Ray Logo" 
              />
              <div>
                <CardTitle className="text-2xl font-bold">Analytics X-Ray</CardTitle>
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
              <h3 className="text-sm font-semibold text-foreground">Quick Actions</h3>
              <Button 
                onClick={handleOpenOptions}
                className="w-full"
                variant="default"
              >
                Extension Settings
              </Button>
            </div>

            <div className="pt-4 border-t border-border">
              <h3 className="text-sm font-semibold text-foreground mb-2">How to Use</h3>
              <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
                <li>Open your browser's DevTools (F12)</li>
                <li>Navigate to the "Analytics X-Ray" panel</li>
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
