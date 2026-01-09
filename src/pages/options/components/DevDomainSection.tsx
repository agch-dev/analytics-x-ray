import { useDomainStore, selectAllowedDomains } from '@src/stores/domainStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@src/components/ui/card';
import { Button } from '@src/components/ui/button';
import { HugeiconsIcon } from '@hugeicons/react';
import { Delete02Icon } from '@hugeicons/core-free-icons';

interface DevDomainSectionProps {
  onClearDomains?: () => void;
}

export const DevDomainSection = ({ onClearDomains }: DevDomainSectionProps) => {
  const allowedDomains = useDomainStore(selectAllowedDomains);
  
  const handleClear = () => {
    if (onClearDomains) {
      onClearDomains();
    } else {
      useDomainStore.getState().clearAllAllowedDomains();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Allowed Domains (Dev Mode)</CardTitle>
        <CardDescription>
          List of domains that have been automatically allowed. Clear for testing purposes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {allowedDomains.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No domains in allowlist</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {allowedDomains.map((allowedDomain) => (
                <div
                  key={allowedDomain.domain}
                  className="p-3 bg-card border border-border rounded-lg flex items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono text-foreground break-all">
                      {allowedDomain.domain}
                    </p>
                    {allowedDomain.allowSubdomains && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Subdomains allowed
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <Button
              variant="destructive"
              onClick={handleClear}
              className="w-full"
            >
              <HugeiconsIcon icon={Delete02Icon} size={18} className="mr-2" />
              Clear All Domains
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

