import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Delete02Icon, ArrowDown01Icon, ArrowUp01Icon } from '@hugeicons/core-free-icons';
import { Button } from '@src/components/ui/button';
import { Label } from '@src/components/ui/label';

interface DeniedDomainListProps {
  domains: string[];
  onRemove: (domain: string) => void;
}

const MAX_VISIBLE_DOMAINS = 3;

export const DeniedDomainList = ({ domains, onRemove }: DeniedDomainListProps) => {
  const [showAll, setShowAll] = useState(false);
  const hasMoreThanMax = domains.length > MAX_VISIBLE_DOMAINS;
  const visibleDomains = hasMoreThanMax && !showAll ? domains.slice(0, MAX_VISIBLE_DOMAINS) : domains;

  if (domains.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 pt-4 border-t">
      <Label>Denied Domains</Label>
      <p className="text-xs text-muted-foreground mb-2">
        Domains you've explicitly denied. Remove them to see the permission prompt again.
      </p>
      <div className="space-y-2">
        {visibleDomains.map((domain) => (
          <div
            key={domain}
            className="flex items-center justify-between p-3 bg-muted/50 border border-border rounded-lg"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-mono text-foreground truncate">
                {domain}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onRemove(domain)}
              aria-label={`Remove ${domain} from denied list`}
            >
              <HugeiconsIcon icon={Delete02Icon} size={18} className="text-destructive" />
            </Button>
          </div>
        ))}
      </div>
      {hasMoreThanMax && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAll(!showAll)}
          className="w-full text-xs text-muted-foreground hover:text-foreground"
        >
          {showAll ? (
            <>
              <HugeiconsIcon icon={ArrowUp01Icon} size={16} className="mr-1" />
              Show less
            </>
          ) : (
            <>
              <HugeiconsIcon icon={ArrowDown01Icon} size={16} className="mr-1" />
              Show {domains.length - MAX_VISIBLE_DOMAINS} more
            </>
          )}
        </Button>
      )}
    </div>
  );
};

