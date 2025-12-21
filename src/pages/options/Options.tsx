import { useState } from 'react';
import { useConfigStore, selectMaxEvents, selectTheme, selectPreferredEventDetailView } from '@src/stores/configStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@src/components/ui/card';
import { Button } from '@src/components/ui/button';
import { Input } from '@src/components/ui/input';
import { Label } from '@src/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@src/components/ui/select';

export default function Options() {
  // Store selectors
  const maxEvents = useConfigStore(selectMaxEvents);
  const theme = useConfigStore(selectTheme);
  const preferredEventDetailView = useConfigStore(selectPreferredEventDetailView);
  
  // Store actions
  const setMaxEvents = useConfigStore((state) => state.setMaxEvents);
  const setTheme = useConfigStore((state) => state.setTheme);
  const setPreferredEventDetailView = useConfigStore((state) => state.setPreferredEventDetailView);
  const reset = useConfigStore((state) => state.reset);

  // Local state for input values and validation
  const [maxEventsInput, setMaxEventsInput] = useState(maxEvents.toString());
  const [maxEventsError, setMaxEventsError] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Validation and update handlers
  const handleMaxEventsBlur = () => {
    const value = parseInt(maxEventsInput, 10);
    if (isNaN(value)) {
      setMaxEventsError('Please enter a valid number');
      setMaxEventsInput(maxEvents.toString());
    } else if (value < 1 || value > 10000) {
      setMaxEventsError('Value must be between 1 and 10,000');
      setMaxEventsInput(maxEvents.toString());
    } else {
      setMaxEventsError('');
      setMaxEvents(value);
    }
  };

  const handleReset = () => {
    if (showResetConfirm) {
      reset();
      setMaxEventsInput('500');
      setMaxEventsError('');
      setShowResetConfirm(false);
    } else {
      setShowResetConfirm(true);
      setTimeout(() => setShowResetConfirm(false), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-2xl space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Analytics X-Ray Settings</h1>
          <p className="text-muted-foreground">
            Configure how the extension captures and displays Segment analytics events.
          </p>
        </div>

        {/* Event Capture Section */}
        <Card>
          <CardHeader>
            <CardTitle>Event Capture</CardTitle>
            <CardDescription>
              Control how events are captured and stored
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Max events input */}
            <div className="space-y-2">
              <Label htmlFor="max-events">Maximum events to store</Label>
              <Input
                id="max-events"
                type="number"
                min="1"
                max="10000"
                value={maxEventsInput}
                onChange={(e) => {
                  setMaxEventsInput(e.target.value);
                  setMaxEventsError('');
                }}
                onBlur={handleMaxEventsBlur}
                className={maxEventsError ? 'border-red-500' : ''}
              />
              {maxEventsError ? (
                <p className="text-sm text-red-500">{maxEventsError}</p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Limit the number of events stored in memory (1-10,000)
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Appearance Section */}
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>
              Customize the extension's visual appearance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="theme">Theme</Label>
              <Select value={theme} onValueChange={setTheme}>
                <SelectTrigger id="theme">
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto (System)</SelectItem>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Choose the color theme for the extension interface
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="preferred-view">Preferred Event Details View</Label>
              <Select value={preferredEventDetailView} onValueChange={setPreferredEventDetailView}>
                <SelectTrigger id="preferred-view">
                  <SelectValue placeholder="Select view mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="structured">Structured</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Default view mode when expanding event details. You can still toggle between views for individual events.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Reset Button */}
        <div className="flex justify-end pt-4 border-t">
          <Button
            variant={showResetConfirm ? "destructive" : "secondary"}
            onClick={handleReset}
            aria-label={showResetConfirm ? "Confirm reset to default settings" : "Reset all settings to default values"}
          >
            {showResetConfirm ? 'Click again to confirm reset' : 'Reset to Defaults'}
          </Button>
        </div>
      </div>
    </div>
  );
}
