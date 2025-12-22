import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Shield01Icon, CheckmarkCircle02Icon, Cancel01Icon } from '@hugeicons/core-free-icons';
import { Button } from '@src/components/ui/button';
import { Switch } from '@src/components/ui/switch';
import { Label } from '@src/components/ui/label';
import { useConfigStore } from '@src/stores/configStore';
import { createContextLogger } from '@src/lib/logger';
import { normalizeDomain, getBaseDomain } from '@src/lib/domain';

const log = createContextLogger('domain-permission-prompt');

interface DomainPermissionPromptProps {
  domain: string;
  onAllowed: () => void;
  onDenied: () => void;
  subdomainInfo?: {
    allowedDomain: { domain: string; allowSubdomains: boolean };
    baseDomain: string;
  } | null;
}

export function DomainPermissionPrompt({
  domain,
  onAllowed,
  onDenied,
  subdomainInfo,
}: DomainPermissionPromptProps) {
  const [allowSubdomains, setAllowSubdomains] = useState(false);
  const addAllowedDomain = useConfigStore((state) => state.addAllowedDomain);
  const updateDomainSubdomainSetting = useConfigStore((state) => state.updateDomainSubdomainSetting);

  const isSubdomainCase = subdomainInfo !== null && subdomainInfo !== undefined;

  const handleAllow = () => {
    if (isSubdomainCase) {
      // This shouldn't be called in subdomain case - use handleAllowAllSubdomains or handleAllowThisSubdomain instead
      return;
    }
    
    // Normalize domain: strip www. and subdomains if allowSubdomains is true
    let normalizedDomain = normalizeDomain(domain);
    if (allowSubdomains) {
      normalizedDomain = getBaseDomain(normalizedDomain);
    }
    
    log.info(`✅ User allowed tracking for domain: ${normalizedDomain} (subdomains: ${allowSubdomains}, original: ${domain})`);
    addAllowedDomain(normalizedDomain, allowSubdomains);
    onAllowed();
  };

  const handleAllowAllSubdomains = () => {
    if (!isSubdomainCase || !subdomainInfo) return;
    
    log.info(`✅ User enabled subdomain tracking for domain: ${subdomainInfo.allowedDomain.domain}`);
    updateDomainSubdomainSetting(subdomainInfo.allowedDomain.domain, true);
    onAllowed();
  };

  const handleAllowThisSubdomain = () => {
    if (!isSubdomainCase || !subdomainInfo) return;
    
    // Add the specific subdomain as-is (normalized, but keep the subdomain)
    const normalizedDomain = normalizeDomain(domain);
    log.info(`✅ User allowed tracking for specific subdomain: ${normalizedDomain} (base: ${subdomainInfo.baseDomain})`);
    addAllowedDomain(normalizedDomain, false);
    onAllowed();
  };

  const handleDeny = () => {
    log.info(`❌ User denied tracking for domain: ${domain}`);
    onDenied();
  };

  // Render subdomain case UI
  if (isSubdomainCase && subdomainInfo) {
    return (
      <div className="flex flex-col items-center justify-start h-full p-4 pb-2 text-center overflow-y-auto">
        <div className="max-w-md space-y-6 mx-auto pt-4">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="rounded-full bg-primary/10 p-4">
              <HugeiconsIcon
                icon={Shield01Icon}
                size={48}
                className="text-primary"
              />
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-foreground">
              Domain Already Allowed
            </h2>
            <p className="text-lg font-mono text-primary">
              {domain}
            </p>
            <p className="text-sm text-muted-foreground">
              Base domain <span className="font-mono">{subdomainInfo.baseDomain}</span> is already allowed, but subdomain scanning is disabled.
            </p>
          </div>

          {/* Description */}
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              Choose how you want to scan this subdomain:
            </p>
            <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-left">
              <p className="font-medium text-foreground">Privacy Notice:</p>
              <ul className="space-y-1 list-disc list-inside text-xs">
                <li>All data is stored locally on your device</li>
                <li>No data is sent to external servers</li>
                <li>You have full control over which domains are locally scanned</li>
              </ul>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <Button
              onClick={handleAllowAllSubdomains}
              className="w-full"
            >
              <HugeiconsIcon icon={CheckmarkCircle02Icon} size={18} className="mr-2" />
              Allow All Subdomains
            </Button>
            <p className="text-xs text-muted-foreground">
              Enable scanning for all subdomains of {subdomainInfo.baseDomain}
            </p>
            
            <Button
              variant="outline"
              onClick={handleAllowThisSubdomain}
              className="w-full"
            >
              <HugeiconsIcon icon={CheckmarkCircle02Icon} size={18} className="mr-2" />
              Allow Only This Subdomain
            </Button>
            <p className="text-xs text-muted-foreground">
              Scan only {domain}, not other subdomains
            </p>
          </div>

          {/* Actions */}
          <div className="pt-2">
            <Button
              variant="ghost"
              onClick={handleDeny}
              className="w-full"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={18} className="mr-2" />
              Don't Scan
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Render normal case UI
  return (
    <div className="flex flex-col items-center justify-start h-full p-4 pb-2 text-center overflow-y-auto">
      <div className="max-w-md space-y-6 mx-auto pt-4">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="rounded-full bg-primary/10 p-4">
            <HugeiconsIcon
              icon={Shield01Icon}
              size={48}
              className="text-primary"
            />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-foreground">
            Allow scanning for this domain?
          </h2>
          <p className="text-lg font-mono text-primary">
            {domain}
          </p>
        </div>

        {/* Description */}
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            This extension will scan Segment analytics events from this domain.
          </p>
          <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-left">
            <p className="font-medium text-foreground">Privacy Notice:</p>
            <ul className="space-y-1 list-disc list-inside text-xs">
              <li>All data is stored locally on your device</li>
              <li>No data is sent to external servers</li>
              <li>You have full control over which domains are locally scanned</li>
            </ul>
          </div>
        </div>

        {/* Subdomain option */}
        <div className="flex items-center justify-between p-4 bg-card border border-border rounded-lg">
          <div className="space-y-0.5 flex-1">
            <Label htmlFor="allow-subdomains" className="text-sm font-medium cursor-pointer">
              Also allow subdomains
            </Label>
            <p className="text-xs text-muted-foreground">
              Automatically scan events from subdomains like app.{normalizeDomain(domain)}, etc.
            </p>
          </div>
          <Switch
            id="allow-subdomains"
            checked={allowSubdomains}
            onCheckedChange={setAllowSubdomains}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            onClick={handleDeny}
            className="flex-1"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={18} className="mr-2" />
            Don't Scan
          </Button>
          <Button
            onClick={handleAllow}
            className="flex-1"
          >
            <HugeiconsIcon icon={CheckmarkCircle02Icon} size={18} className="mr-2" />
            Allow Scanning
          </Button>
        </div>
      </div>
    </div>
  );
}

