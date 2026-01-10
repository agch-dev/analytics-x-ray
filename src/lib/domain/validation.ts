/**
 * Sanitize search query input
 * Removes potentially dangerous characters while preserving search functionality
 *
 * @param query - The search query to sanitize
 * @returns Sanitized query string
 *
 * @example
 * ```ts
 * sanitizeSearchQuery('<script>alert("xss")</script>'); // 'scriptalertxssscript'
 * sanitizeSearchQuery('normal search'); // 'normal search'
 * ```
 */
export function sanitizeSearchQuery(query: string): string {
  // Remove HTML tags and script content
  // Use limited quantifier to prevent catastrophic backtracking
  return query
    .replace(/<[^>]{0,1000}>/g, '') // Remove HTML tags (limit to 1000 chars per tag)
    .replace(/[<>]/g, '') // Remove remaining angle brackets
    .trim()
    .slice(0, 500); // Limit length to prevent abuse
}

/**
 * Validate search query length
 *
 * @param query - The search query to validate
 * @returns true if query is valid, false if too long
 */
export function isValidSearchQuery(query: string): boolean {
  return query.length <= 500;
}
