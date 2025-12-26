import { HugeiconsIcon } from '@hugeicons/react';
import { Delete02Icon } from '@hugeicons/core-free-icons';
import { Button } from '@src/components/ui/button';
import { Label } from '@src/components/ui/label';

interface DeniedDomainListProps {
  domains: string[];
  onRemove: (domain: string) => void;
}

export const DeniedDomainList = ({ domains, onRemove }: DeniedDomainListProps) => {
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
        {domains.map((domain) => (
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
    </div>
  );
};

