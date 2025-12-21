import { highlightText } from '@src/lib/search';

interface HighlightedTextProps {
  text: string;
  searchQuery?: string;
  className?: string;
}

/**
 * Component that highlights matching text in a string based on a search query.
 * Used for search highlighting across the application.
 */
export function HighlightedText({
  text,
  searchQuery,
  className,
}: HighlightedTextProps) {
  if (!searchQuery) {
    return <span className={className}>{text}</span>;
  }

  const parts = highlightText(text, searchQuery);

  return (
    <span className={className}>
      {parts.map((part, index) =>
        part.highlight ? (
          <mark
            key={index}
            className="bg-yellow-500/30 dark:bg-yellow-500/40 text-foreground rounded px-0.5"
          >
            {part.text}
          </mark>
        ) : (
          <span key={index}>{part.text}</span>
        )
      )}
    </span>
  );
}

