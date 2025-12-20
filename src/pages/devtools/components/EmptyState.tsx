import { HugeiconsIcon } from '@hugeicons/react';
import { Analytics01Icon, SearchRemoveIcon } from '@hugeicons/core-free-icons';

interface EmptyStateProps {
  searchQuery?: string;
}

export function EmptyState({ searchQuery }: EmptyStateProps) {
  const hasSearchQuery = Boolean(searchQuery?.trim());

  return (
    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
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
          <p className="text-xs mt-1 opacity-60">
            Try adjusting your search query or filters
          </p>
        </>
      ) : (
        <>
          <p className="text-sm">No events captured yet</p>
          <p className="text-xs mt-1 opacity-60">
            Navigate to a page with Segment analytics to see events
          </p>
        </>
      )}
    </div>
  );
}

