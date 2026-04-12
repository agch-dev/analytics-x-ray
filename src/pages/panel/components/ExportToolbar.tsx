import { Button } from '@src/components/ui/button';

interface ExportToolbarProps {
  readonly selectedCount: number;
  readonly totalCount: number;
  readonly onSelectAll: () => void;
  readonly onDeselectAll: () => void;
  readonly onExport: () => void;
  readonly onCancel: () => void;
}

export function ExportToolbar({
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onExport,
  onCancel,
}: ExportToolbarProps) {
  const allSelected = selectedCount === totalCount && totalCount > 0;

  return (
    <div
      className={`
        flex items-center gap-2 border-b border-border bg-card px-4 py-2
      `}
    >
      {/* Select / Deselect buttons */}
      <Button
        variant="outline"
        size="sm"
        onClick={allSelected ? onDeselectAll : onSelectAll}
        className="h-7 text-xs"
        aria-label={allSelected ? 'Deselect all events' : 'Select all events'}
      >
        {allSelected ? 'Deselect All' : 'Select All'}
      </Button>

      {/* Hint text */}
      <span className="flex-1 text-center text-xs text-muted-foreground">
        Shift+click for range
      </span>

      {/* Export button */}
      <Button
        variant="default"
        size="sm"
        onClick={onExport}
        disabled={selectedCount === 0}
        className="h-7 text-xs"
        aria-label={`Export ${selectedCount} events`}
      >
        Export{selectedCount > 0 ? ` (${selectedCount})` : ''}
      </Button>

      {/* Cancel button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onCancel}
        className="h-7 text-xs text-muted-foreground"
        aria-label="Cancel export"
      >
        Cancel
      </Button>
    </div>
  );
}
