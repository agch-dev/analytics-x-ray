import { Badge } from '@src/components/ui/badge';
import { Button } from '@src/components/ui/button';

interface HeaderProps {
  eventCount: number;
  onScrollToBottom: () => void;
  onClear: () => void;
}

export function Header({ eventCount, onScrollToBottom, onClear }: HeaderProps) {
  return (
    <header className="shrink-0 px-4 py-3 border-b border-border bg-card flex items-center justify-between">
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-semibold text-foreground">
          Analytics X-Ray
        </h1>
        <Badge variant="secondary" className="text-xs font-mono">
          {eventCount} events
        </Badge>
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onScrollToBottom}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          ↓ Latest
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="text-xs text-muted-foreground hover:text-destructive"
        >
          Clear
        </Button>
      </div>
    </header>
  );
}

