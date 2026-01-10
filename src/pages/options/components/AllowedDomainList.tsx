import {
  Delete02Icon,
  ArrowDown01Icon,
  ArrowUp01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useState } from 'react';

import { Button } from '@src/components/ui/button';
import { Label } from '@src/components/ui/label';
import { Switch } from '@src/components/ui/switch';
import type { AllowedDomain } from '@src/stores';

interface AllowedDomainListProps {
  domains: AllowedDomain[];
  onRemove: (domain: string) => void;
  onToggleSubdomains: (domain: string, currentValue: boolean) => void;
}

const MAX_VISIBLE_DOMAINS = 3;

export const AllowedDomainList = ({
  domains,
  onRemove,
  onToggleSubdomains,
}: AllowedDomainListProps) => {
  const [showAll, setShowAll] = useState(false);
  const hasMoreThanMax = domains.length > MAX_VISIBLE_DOMAINS;
  const visibleDomains =
    hasMoreThanMax && !showAll
      ? domains.slice(0, MAX_VISIBLE_DOMAINS)
      : domains;

  if (domains.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <p className="text-sm">No domains in allowlist</p>
        <p className="mt-1 text-xs">
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
            className="space-y-3 rounded-lg border border-border bg-card p-3"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-mono text-sm break-all text-foreground">
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
                <HugeiconsIcon
                  icon={Delete02Icon}
                  size={18}
                  className="text-destructive"
                />
              </Button>
            </div>
            <div
              className={`
              flex items-center justify-between gap-2 border-t border-border/50
              pt-2
            `}
            >
              <div className="flex items-center gap-2">
                <Label
                  htmlFor={`subdomain-${allowedDomain.domain}`}
                  className="cursor-pointer text-xs text-muted-foreground"
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
          className={`
            w-full text-xs text-muted-foreground
            hover:text-foreground
          `}
        >
          {showAll ? (
            <>
              <HugeiconsIcon icon={ArrowUp01Icon} size={16} className="mr-1" />
              Show less
            </>
          ) : (
            <>
              <HugeiconsIcon
                icon={ArrowDown01Icon}
                size={16}
                className="mr-1"
              />
              Show {domains.length - MAX_VISIBLE_DOMAINS} more
            </>
          )}
        </Button>
      )}
    </div>
  );
};
