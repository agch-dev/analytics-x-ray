import { useState, useEffect } from 'react';
import Browser from 'webextension-polyfill';
import { HugeiconsIcon } from '@hugeicons/react';
import { Delete02Icon, Add01Icon } from '@hugeicons/core-free-icons';
import { useConfigStore, selectMaxEvents, selectTheme, selectPreferredEventDetailView, selectAllowedDomains, selectDeniedDomains } from '@src/stores/configStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@src/components/ui/card';
import { Button } from '@src/components/ui/button';
import { Input } from '@src/components/ui/input';
import { Label } from '@src/components/ui/label';
import { Switch } from '@src/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@src/components/ui/select';
import { extractDomain, normalizeDomain, getBaseDomain } from '@src/lib/domain';
import { createContextLogger } from '@src/lib/logger';

const log = createContextLogger('ui');

export default function Options() {
  // Store selectors
  const maxEvents = useConfigStore(selectMaxEvents);
  const theme = useConfigStore(selectTheme);
  const preferredEventDetailView = useConfigStore(selectPreferredEventDetailView);
  const allowedDomains = useConfigStore(selectAllowedDomains);
  const deniedDomains = useConfigStore(selectDeniedDomains);
  
  // Store actions
  const setMaxEvents = useConfigStore((state) => state.setMaxEvents);
  const setTheme = useConfigStore((state) => state.setTheme);
  const setPreferredEventDetailView = useConfigStore((state) => state.setPreferredEventDetailView);
  const addAllowedDomain = useConfigStore((state) => state.addAllowedDomain);
  const removeAllowedDomain = useConfigStore((state) => state.removeAllowedDomain);
  const updateDomainSubdomainSetting = useConfigStore((state) => state.updateDomainSubdomainSetting);
  const removeDeniedDomain = useConfigStore((state) => state.removeDeniedDomain);
  const reset = useConfigStore((state) => state.reset);

  // Local state for input values and validation
  const [maxEventsInput, setMaxEventsInput] = useState(maxEvents.toString());
  const [maxEventsError, setMaxEventsError] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  
  // Domain tracking state
  const [newDomainInput, setNewDomainInput] = useState('');
  const [newDomainError, setNewDomainError] = useState('');

  // Listen for storage changes to sync config updates from other extension contexts
  useEffect(() => {
    const handleStorageChange = (
      changes: Browser.Storage.StorageAreaOnChangedChangesType,
      areaName: string
    ) => {
      // Only listen to local storage changes
      if (areaName !== 'local') return;
      
      // Check if the config storage key changed
      const configKey = 'analytics-xray-config';
      if (changes[configKey]) {
        log.debug('Config storage changed, rehydrating store...');
        
        // Read the new config from storage and update the store
        Browser.storage.local.get(configKey).then((result) => {
          const storedValue = result[configKey];
          if (storedValue && typeof storedValue === 'string') {
            try {
              const parsed = JSON.parse(storedValue);
              const { state: newState } = parsed;
              if (newState) {
                // Update the store with the new state
                useConfigStore.setState(newState);
                log.debug('Config store rehydrated from storage');
              }
            } catch (error) {
              log.error('Failed to parse config from storage:', error);
            }
          }
        });
      }
    };
    
    Browser.storage.onChanged.addListener(handleStorageChange);
    
    return () => {
      Browser.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

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

  // Domain tracking handlers
  const handleAddDomain = (allowSubdomains: boolean = false) => {
    const trimmed = newDomainInput.trim();
    if (!trimmed) {
      setNewDomainError('Please enter a domain');
      return;
    }

    // Try to extract domain from URL if user pasted a full URL
    let domain = extractDomain(trimmed);
    if (!domain) {
      // If extraction failed, try using the input as-is (might be just a domain)
      // Basic validation: should be a valid domain format
      const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
      if (domainRegex.test(trimmed)) {
        domain = trimmed.toLowerCase();
      } else {
        setNewDomainError('Please enter a valid domain (e.g., example.com)');
        return;
      }
    }

    // Normalize domain: strip www. and subdomains if allowSubdomains is true
    let normalizedDomain = normalizeDomain(domain);
    if (allowSubdomains) {
      // If allowing subdomains, store only the base domain
      normalizedDomain = getBaseDomain(normalizedDomain);
    }

    // Check if domain already exists (compare normalized)
    if (allowedDomains.some((d) => {
      const existingNormalized = normalizeDomain(d.domain);
      if (d.allowSubdomains) {
        return getBaseDomain(existingNormalized) === normalizedDomain;
      }
      return existingNormalized === normalizedDomain;
    })) {
      setNewDomainError('This domain is already in the allowlist');
      return;
    }

    // Add normalized domain
    addAllowedDomain(normalizedDomain, allowSubdomains);
    setNewDomainInput('');
    setNewDomainError('');
  };

  const handleRemoveDomain = (domain: string) => {
    removeAllowedDomain(domain);
  };

  const handleToggleSubdomains = (domain: string, currentValue: boolean) => {
    updateDomainSubdomainSetting(domain, !currentValue);
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

        {/* Domain Tracking Section */}
        <Card>
          <CardHeader>
            <CardTitle>Domain Scanning</CardTitle>
            <CardDescription>
              Control which domains have their Segment events scanned
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium text-foreground">Privacy Notice</p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>All data is stored locally on your device</li>
                <li>No data is sent to external servers</li>
                <li>You have full control over which domains are locally scanned</li>
              </ul>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-domain">Add Domain</Label>
                <div className="flex gap-2">
                  <Input
                    id="new-domain"
                    type="text"
                    placeholder="example.com"
                    value={newDomainInput}
                    onChange={(e) => {
                      setNewDomainInput(e.target.value);
                      setNewDomainError('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAddDomain(false);
                      }
                    }}
                    className={newDomainError ? 'border-red-500' : ''}
                  />
                  <Button onClick={() => handleAddDomain(false)}>
                    <HugeiconsIcon icon={Add01Icon} size={18} className="mr-2" />
                    Add
                  </Button>
                </div>
                {newDomainError ? (
                  <p className="text-sm text-red-500">{newDomainError}</p>
                ) : (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      Enter a domain name (e.g., example.com) or a full URL. Only domains in this list will have their Segment events scanned.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <strong>Tip:</strong> Use "Allow subdomains" for cases like PR Preview Apps where the subdomain is dynamic (e.g., pr-123.example.com, pr-456.example.com).
                    </p>
                  </div>
                )}
              </div>

              {allowedDomains.length > 0 && (
                <div className="space-y-2">
                  <Label>Allowed Domains</Label>
                  <div className="space-y-2">
                    {allowedDomains.map((allowedDomain) => (
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
                            onClick={() => handleRemoveDomain(allowedDomain.domain)}
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
                                handleToggleSubdomains(allowedDomain.domain, !checked)
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
                </div>
              )}

              {allowedDomains.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">No domains in allowlist</p>
                  <p className="text-xs mt-1">
                    Add a domain above to start scanning Segment events
                  </p>
                </div>
              )}

              {deniedDomains.length > 0 && (
                <div className="space-y-2 pt-4 border-t">
                  <Label>Denied Domains</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Domains you've explicitly denied. Remove them to see the permission prompt again.
                  </p>
                  <div className="space-y-2">
                    {deniedDomains.map((domain) => (
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
                          onClick={() => removeDeniedDomain(domain)}
                          aria-label={`Remove ${domain} from denied list`}
                        >
                          <HugeiconsIcon icon={Delete02Icon} size={18} className="text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
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
