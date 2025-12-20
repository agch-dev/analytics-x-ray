import { Badge } from '@src/components/ui/badge';
import { Button } from '@src/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@src/components/ui/dropdown-menu';
import { HugeiconsIcon } from '@hugeicons/react';
import { 
  Analytics01Icon, 
  ArrowDown01Icon, 
  Delete02Icon,
  MoreVerticalIcon,
  Settings02Icon
} from '@hugeicons/core-free-icons';
import Browser from 'webextension-polyfill';

interface HeaderProps {
  eventCount: number;
  onScrollToBottom: () => void;
  onClear: () => void;
}

export function Header({ eventCount, onScrollToBottom, onClear }: HeaderProps) {
  const handleOpenSettings = () => {
    Browser.runtime.openOptionsPage();
  };

  return (
    <header className="shrink-0 px-4 py-3 border-b border-border bg-card flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={Analytics01Icon} size={18} className="text-blue-400" />
          <h1 className="text-sm font-semibold text-foreground">
            Analytics X-Ray
          </h1>
        </div>
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
          <HugeiconsIcon icon={ArrowDown01Icon} size={14} className="mr-1" />
          Latest
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="text-xs text-muted-foreground hover:text-destructive"
        >
          <HugeiconsIcon icon={Delete02Icon} size={14} className="mr-1" />
          Clear
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              <HugeiconsIcon icon={MoreVerticalIcon} size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={handleOpenSettings}>
              <HugeiconsIcon icon={Settings02Icon} size={14} className="mr-2" />
              Settings
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

