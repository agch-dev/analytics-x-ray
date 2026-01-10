import { Analytics01Icon, SearchRemoveIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

interface EmptyStateProps {
  searchQuery?: string;
}

export function EmptyState({ searchQuery }: EmptyStateProps) {
  const hasSearchQuery = Boolean(searchQuery?.trim());

  return (
    <div
      className={`
      flex h-full flex-col items-center justify-center text-muted-foreground
    `}
    >
      <div className="mb-4 opacity-20">
        <HugeiconsIcon
          icon={hasSearchQuery ? SearchRemoveIcon : Analytics01Icon}
          size={48}
          className="text-current"
        />
      </div>
      {hasSearchQuery ? (
        <>
          <p className="text-sm">No events match your search</p>
          <p className="mt-1 text-xs opacity-60">
            Try adjusting your search query or filters
          </p>
        </>
      ) : (
        <>
          <p className="text-sm">No events captured yet</p>
          <p className="mt-1 text-xs opacity-60">
            Navigate to a page with Segment analytics to see events
          </p>
        </>
      )}
    </div>
  );
}
