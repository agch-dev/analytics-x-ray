import { Add01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { Button } from '@src/components/ui/button';
import { Input } from '@src/components/ui/input';
import { Label } from '@src/components/ui/label';

interface AddDomainInputProps {
  value: string;
  error: string;
  onChange: (value: string) => void;
  onAdd: (allowSubdomains: boolean) => void;
}

export const AddDomainInput = ({
  value,
  error,
  onChange,
  onAdd,
}: AddDomainInputProps) => (
  <div className="space-y-2">
    <Label htmlFor="new-domain">Add Domain</Label>
    <div className="flex gap-2">
      <Input
        id="new-domain"
        type="text"
        placeholder="example.com"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onAdd(false);
          }
        }}
        className={error ? 'border-red-500' : ''}
      />
      <Button onClick={() => onAdd(false)}>
        <HugeiconsIcon icon={Add01Icon} size={18} className="mr-2" />
        Add
      </Button>
    </div>
    {error ? (
      <p className="text-sm text-red-500">{error}</p>
    ) : (
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">
          Enter a domain name (e.g., example.com) or a full URL. Only domains in
          this list will have their Segment events scanned.
        </p>
        <p className="text-xs text-muted-foreground">
          <strong>Tip:</strong> Use &quot;Allow subdomains&quot; for cases like
          PR Preview Apps where the subdomain is dynamic (e.g.,
          pr-123.example.com, pr-456.example.com).
        </p>
      </div>
    )}
  </div>
);
