import { useState, useMemo } from 'react';
import { useConfigStore } from '@src/stores/configStore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@src/components/ui/dialog';
import { Button } from '@src/components/ui/button';
import { Switch } from '@src/components/ui/switch';
import { Label } from '@src/components/ui/label';
import type { SubsectionDefinition } from './SubsectionGroup';

interface SectionDefaultsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectionKey: 'context' | 'metadata';
  sectionTitle: string;
  subsections: SubsectionDefinition[];
}

/**
 * Maps subsection keys to their prefixed config keys
 * Handles special case where 'metadata' subsection key maps to 'metadataCaptureInfo' in config
 */
function getPrefixedSubsectionKey(sectionKey: 'context' | 'metadata', subsectionKey: string): string {
  // Special case: 'metadata' subsection key maps to 'metadataCaptureInfo' in config
  if (sectionKey === 'metadata' && subsectionKey === 'metadata') {
    return 'metadataCaptureInfo';
  }
  return `${sectionKey}${subsectionKey.charAt(0).toUpperCase()}${subsectionKey.slice(1)}`;
}

/**
 * Maps prefixed config keys back to subsection keys
 */
function getUnprefixedSubsectionKey(sectionKey: 'context' | 'metadata', prefixedKey: string): string {
  const prefix = sectionKey;
  if (prefixedKey.startsWith(prefix)) {
    const rest = prefixedKey.slice(prefix.length);
    return rest.charAt(0).toLowerCase() + rest.slice(1);
  }
  return prefixedKey;
}

export function SectionDefaultsModal({
  open,
  onOpenChange,
  sectionKey,
  sectionTitle,
  subsections,
}: SectionDefaultsModalProps) {
  const sectionDefaults = useConfigStore((state) => state.sectionDefaults);
  const setSectionDefaultExpanded = useConfigStore((state) => state.setSectionDefaultExpanded);
  const setSubsectionDefaultExpanded = useConfigStore((state) => state.setSubsectionDefaultExpanded);
  const setSpecialDefault = useConfigStore((state) => state.setSpecialDefault);

  // Get current section default
  const sectionDefaultExpanded = sectionDefaults.sections[sectionKey];

  // Get current subsection defaults (map from prefixed keys to unprefixed)
  const subsectionDefaults = useMemo(() => {
    const defaults: Record<string, boolean> = {};
    const configSubsections = sectionDefaults.subsections[sectionKey];
    
    for (const subsection of subsections) {
      const prefixedKey = getPrefixedSubsectionKey(sectionKey, subsection.key);
      defaults[subsection.key] = configSubsections[prefixedKey as keyof typeof configSubsections] ?? false;
    }
    
    return defaults;
  }, [sectionDefaults.subsections, sectionKey, subsections]);

  // Get special defaults
  const specialDefaults = sectionDefaults.specialDefaults;
  const specialDefaultKey = sectionKey === 'context' 
    ? 'contextPageAlwaysOpenForPageEvents' 
    : 'metadataIdentifiersAlwaysOpenForIdentityEvents';

  const handleSectionToggle = (checked: boolean) => {
    setSectionDefaultExpanded(sectionKey, checked);
  };

  const handleSubsectionToggle = (subsectionKey: string, checked: boolean) => {
    const prefixedKey = getPrefixedSubsectionKey(sectionKey, subsectionKey);
    setSubsectionDefaultExpanded(sectionKey, prefixedKey, checked);
  };

  const handleSpecialDefaultToggle = (checked: boolean) => {
    setSpecialDefault(specialDefaultKey, checked);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Configure {sectionTitle} Defaults</DialogTitle>
          <DialogDescription>
            Set default open/closed states for {sectionTitle.toLowerCase()} section and its subsections.
            These settings apply to all events.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Section default */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="section-default" className="text-sm font-medium">
                {sectionTitle} section open by default
              </Label>
              <p className="text-xs text-muted-foreground">
                Controls whether the {sectionTitle.toLowerCase()} section is expanded by default
              </p>
            </div>
            <Switch
              id="section-default"
              checked={sectionDefaultExpanded}
              onCheckedChange={handleSectionToggle}
            />
          </div>

          {/* Subsections */}
          {subsections.length > 0 && (
            <div className="space-y-4">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Subsections</Label>
                <p className="text-xs text-muted-foreground">
                  Set default open/closed states for each subsection
                </p>
              </div>
              <div className="space-y-3 pl-4 border-l-2 border-border">
                {subsections.map((subsection) => (
                  <div key={subsection.key} className="flex items-center justify-between">
                    <Label
                      htmlFor={`subsection-${subsection.key}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {subsection.title}
                    </Label>
                    <Switch
                      id={`subsection-${subsection.key}`}
                      checked={subsectionDefaults[subsection.key] ?? false}
                      onCheckedChange={(checked) => handleSubsectionToggle(subsection.key, checked)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Special defaults */}
          <div className="space-y-4 pt-2 border-t border-border">
            {sectionKey === 'context' && (
              <div className="flex items-center justify-between">
                <div className="space-y-0.5 flex-1 pr-4">
                  <Label htmlFor="special-context" className="text-sm font-medium">
                    Page subsection always open for page events
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    When enabled, the page subsection will always be expanded for page events,
                    even if the section is set to collapsed by default
                  </p>
                </div>
                <Switch
                  id="special-context"
                  checked={specialDefaults.contextPageAlwaysOpenForPageEvents}
                  onCheckedChange={handleSpecialDefaultToggle}
                />
              </div>
            )}
            {sectionKey === 'metadata' && (
              <div className="flex items-center justify-between">
                <div className="space-y-0.5 flex-1 pr-4">
                  <Label htmlFor="special-metadata" className="text-sm font-medium">
                    Identifiers always open for identify, alias and group events
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    When enabled, the identifiers subsection will always be expanded for identify,
                    alias, and group events, even if the section is set to collapsed by default
                  </p>
                </div>
                <Switch
                  id="special-metadata"
                  checked={specialDefaults.metadataIdentifiersAlwaysOpenForIdentityEvents}
                  onCheckedChange={handleSpecialDefaultToggle}
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

