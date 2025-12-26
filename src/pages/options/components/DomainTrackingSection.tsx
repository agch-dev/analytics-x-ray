import { useState } from 'react';
import { useConfigStore, selectAllowedDomains } from '@src/stores/configStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@src/components/ui/card';
import { extractDomain, normalizeDomain, getBaseDomain } from '@src/lib/domain';
import { AddDomainInput } from './AddDomainInput';
import { AllowedDomainList } from './AllowedDomainList';

export const DomainTrackingSection = () => {
  const allowedDomains = useConfigStore(selectAllowedDomains);
  const addAllowedDomain = useConfigStore((state) => state.addAllowedDomain);
  const removeAllowedDomain = useConfigStore((state) => state.removeAllowedDomain);
  const updateDomainSubdomainSetting = useConfigStore((state) => state.updateDomainSubdomainSetting);

  const [newDomainInput, setNewDomainInput] = useState('');
  const [newDomainError, setNewDomainError] = useState('');

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
    <Card>
      <CardHeader>
        <CardTitle>Domain Scanning</CardTitle>
        <CardDescription>
          Control which domains have their Segment events scanned
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-muted rounded-lg p-4 space-y-2">
          <p className="text-sm font-medium text-foreground">Privacy Notice</p>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>All data is stored locally on your device</li>
            <li>No data is sent to external servers</li>
          </ul>
        </div>

        <div className="space-y-4">
          <AddDomainInput
            value={newDomainInput}
            error={newDomainError}
            onChange={(value) => {
              setNewDomainInput(value);
              setNewDomainError('');
            }}
            onAdd={handleAddDomain}
          />

          <AllowedDomainList
            domains={allowedDomains}
            onRemove={handleRemoveDomain}
            onToggleSubdomains={handleToggleSubdomains}
          />
        </div>
      </CardContent>
    </Card>
  );
};

