/**
 * Library Utilities Barrel Export
 *
 * Central export point for all utility functions and helpers.
 */

// Utils
export {
  cn,
  isDevMode,
  copyToClipboard,
  normalizeEventNameForFilter,
} from './utils';

// Logger
export { createContextLogger } from './logger';

// Search
export {
  parseSearchQuery,
  eventMatchesSearch,
  highlightText,
  type SearchMatch,
} from './search';

// JSON View Theme
export { getJsonViewTheme, getValueTypeColor } from './jsonViewTheme';

// Storage
export {
  createChromeStorage,
  createTabStorage,
  cleanupTabStorage,
  cleanupStaleTabs,
  logStorageSize,
} from './storage';

// Segment Parsing
export {
  SEGMENT_ENDPOINTS,
  detectProvider,
  decodeRequestBody,
  parseSegmentPayload,
  processBatchPayload,
} from './parsing/segment';

// Domain
export {
  extractDomain,
  normalizeDomain,
  getBaseDomain,
  isDomainAllowed,
  getTabDomain,
  isSpecialPage,
} from './domain';

// Domain Validation
export {
  validateDomainInput,
  sanitizeSearchQuery,
  isValidSearchQuery,
} from './domain/validation';

// Version
export { getFormattedVersion } from './version';

// Array Chunking
export {
  INITIAL_CHUNK_SIZE,
  CHUNK_SIZE,
  chunkArray,
  shouldChunkArray,
} from './arrayChunking';

// Event Buckets
export { categorizeEvent, getBucketColor } from './eventBuckets';
