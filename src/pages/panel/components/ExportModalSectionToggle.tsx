import { cn } from '@src/lib';

import { Label, Switch } from '@components/ui';

interface SectionToggleProps {
  sectionKey: string;
  label: string;
  checked: boolean;
  disabled?: boolean;
  indented?: boolean;
  isGroup?: boolean;
  onToggle: () => void;
}

export function SectionToggle({
  sectionKey,
  label,
  checked,
  disabled,
  indented,
  isGroup,
  onToggle,
}: Readonly<SectionToggleProps>) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-2',
        isGroup ? 'mt-1.5 border-t border-border/50 pt-1.5' : 'py-0.5',
        indented && 'pl-4'
      )}
    >
      <Label
        htmlFor={`export-${sectionKey}`}
        className={cn(
          'cursor-pointer text-xs',
          isGroup &&
            `
              text-[11px] font-semibold tracking-wide text-muted-foreground
              uppercase
            `,
          disabled && 'cursor-default opacity-50'
        )}
      >
        {label}
      </Label>
      <Switch
        id={`export-${sectionKey}`}
        checked={checked}
        onCheckedChange={onToggle}
        disabled={disabled}
        className="h-5 w-9"
      />
    </div>
  );
}
