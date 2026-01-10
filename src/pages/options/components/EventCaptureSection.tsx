import { useState, useEffect } from 'react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@src/components/ui/card';
import { Input } from '@src/components/ui/input';
import { Label } from '@src/components/ui/label';
import { useConfigStore, selectMaxEvents } from '@src/stores';

export const EventCaptureSection = () => {
  const maxEvents = useConfigStore(selectMaxEvents);
  const setMaxEvents = useConfigStore((state) => state.setMaxEvents);
  const [maxEventsInput, setMaxEventsInput] = useState(maxEvents.toString());
  const [maxEventsError, setMaxEventsError] = useState('');

  // Sync input with store value when it changes externally (e.g., reset)
  useEffect(() => {
    setMaxEventsInput(maxEvents.toString());
    setMaxEventsError('');
  }, [maxEvents]);

  const handleMaxEventsBlur = () => {
    const value = parseInt(maxEventsInput, 10);
    if (isNaN(value)) {
      setMaxEventsError('Please enter a valid number');
      setMaxEventsInput(maxEvents.toString());
    } else if (value < 1 || value > 1000) {
      setMaxEventsError('Value must be between 1 and 1000');
      setMaxEventsInput(maxEvents.toString());
    } else {
      setMaxEventsError('');
      setMaxEvents(value);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Event Capture</CardTitle>
        <CardDescription>
          Control how events are captured and stored
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="max-events">Maximum events to store</Label>
          <Input
            id="max-events"
            type="number"
            min="1"
            max="1000"
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
              Limit the number of events stored in memory per tab (1-1000)
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
