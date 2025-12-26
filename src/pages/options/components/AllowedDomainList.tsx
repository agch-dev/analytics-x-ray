import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Delete02Icon, ArrowDown01Icon, ArrowUp01Icon } from '@hugeicons/core-free-icons';
import { Button } from '@src/components/ui/button';
import { Label } from '@src/components/ui/label';
import { Switch } from '@src/components/ui/switch';
import type { AllowedDomain } from '@src/stores/configStore';

interface AllowedDomainListProps {
  domains: AllowedDomain[];
  onRemove: (domain: string) => void;
  onToggleSubdomains: (domain: string, currentValue: boolean) => void;
}

const MAX_VISIBLE_DOMAINS = 3;

export const AllowedDomainList = ({ domains, onRemove, onToggleSubdomains }: AllowedDomainListProps) => {
  const [showAll, setShowAll] = useState(false);
  const hasMoreThanMax = domains.length > MAX_VISIBLE_DOMAINS;
  const visibleDomains = hasMoreThanMax && !showAll ? domains.slice(0, MAX_VISIBLE_DOMAINS) : domains;

  if (domains.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">No domains in allowlist</p>
        <p className="text-xs mt-1">
          Add a domain above to start scanning Segment events
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label>Allowed Domains</Label>
      <div className="space-y-2">
        {visibleDomains.map((allowedDomain) => (
          <div
            key={allowedDomain.domain}
            className="p-3 bg-card border border-border rounded-lg space-y-3"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-mono text-foreground break-all">
                  {allowedDomain.domain}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onRemove(allowedDomain.domain);
                }}
                aria-label={`Remove ${allowedDomain.domain}`}
                className="shrink-0"
              >
                <HugeiconsIcon icon={Delete02Icon} size={18} className="text-destructive" />
              </Button>
            </div>
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50">
              <div className="flex items-center gap-2">
                <Label
                  htmlFor={`subdomain-${allowedDomain.domain}`}
                  className="text-xs text-muted-foreground cursor-pointer"
                >
                  Allow subdomains
                </Label>
                <Switch
                  id={`subdomain-${allowedDomain.domain}`}
                  checked={allowedDomain.allowSubdomains}
                  onCheckedChange={(checked) =>
                    onToggleSubdomains(allowedDomain.domain, !checked)
                  }
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {allowedDomain.allowSubdomains
                  ? 'Subdomains allowed'
                  : 'Exact domain only'}
              </p>
            </div>
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

