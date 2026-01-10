import { useState } from 'react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@src/components/ui/card';
import { normalizeDomain, getBaseDomain } from '@src/lib/domain';
import { validateDomainInput } from '@src/lib/domain/validation';
import { useDomainStore, selectAllowedDomains } from '@src/stores';

import { AddDomainInput } from './AddDomainInput';
import { AllowedDomainList } from './AllowedDomainList';

export const DomainTrackingSection = () => {
  const allowedDomains = useDomainStore(selectAllowedDomains);
  const addAllowedDomain = useDomainStore((state) => state.addAllowedDomain);
  const removeAllowedDomain = useDomainStore(
    (state) => state.removeAllowedDomain
  );
  const updateDomainSubdomainSetting = useDomainStore(
    (state) => state.updateDomainSubdomainSetting
  );

  const [newDomainInput, setNewDomainInput] = useState('');
  const [newDomainError, setNewDomainError] = useState('');

  const handleAddDomain = (allowSubdomains: boolean = false) => {
    const trimmed = newDomainInput.trim();
    if (!trimmed) {
      setNewDomainError('Please enter a domain');
      return;
    }

    // Validate domain input
    const validation = validateDomainInput(trimmed);
    if (!validation.isValid || !validation.normalizedDomain) {
      setNewDomainError(validation.error || 'Invalid domain');
      return;
    }

    // Normalize domain: strip www. and subdomains if allowSubdomains is true
    let normalizedDomain = validation.normalizedDomain;
    if (allowSubdomains) {
      // If allowing subdomains, store only the base domain
      normalizedDomain = getBaseDomain(normalizedDomain);
    }

    // Check if domain already exists (compare normalized)
    if (
      allowedDomains.some((d) => {
        const existingNormalized = normalizeDomain(d.domain);
        if (d.allowSubdomains) {
          return getBaseDomain(existingNormalized) === normalizedDomain;
        }
        return existingNormalized === normalizedDomain;
      })
    ) {
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
        <div className="space-y-2 rounded-lg bg-muted p-4">
          <p className="text-sm font-medium text-foreground">Privacy Notice</p>
          <ul
            className={`
              list-inside list-disc space-y-1 text-xs text-muted-foreground
            `}
          >
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
