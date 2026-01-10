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
}: Readonly<HighlightedTextProps>) {
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
            className={`
              rounded bg-yellow-500/30 px-0.5 text-foreground
              dark:bg-yellow-500/40
            `}
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
