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
export {
  logger,
  createContextLogger,
  type LogLevel,
  type LogContext,
} from './logger';

// Search
export {
  parseSearchQuery,
  eventMatchesSearch,
  highlightText,
  type SearchMatch,
} from './search';

// JSON View Theme
export {
  getJsonViewTheme,
  getValueTypeColor,
  isDarkMode,
} from './jsonViewTheme';

// Storage
export {
  createChromeStorage,
  createTabStorage,
  getCurrentTabId,
  cleanupTabStorage,
  cleanupStaleTabs,
  getStorageSizeInfo,
  logStorageSize,
  type StorageAdapter,
  type StorageSizeInfo,
} from './storage';

// Storage Type Guards
export {
  isSegmentEventArray,
  isStoredEvents,
  isNumberArray,
  isStorageResult,
} from './storage';

// Segment Parsing
export {
  SEGMENT_ENDPOINTS,
  detectProvider,
  decodeRequestBody,
  parseSegmentPayload,
  isValidBatchEvent,
  getEventName,
  normalizeEvent,
  processBatchPayload,
  EVENT_TYPE_COLORS,
  EVENT_TYPE_LABELS,
  type SegmentEventType,
  type SegmentProvider,
  type SegmentContext,
  type SegmentBatchEvent,
  type SegmentBatchPayload,
  type SegmentEvent,
} from './parsing/segment';

// Domain
export {
  extractDomain,
  normalizeDomain,
  getBaseDomain,
  matchesDomainWithSubdomains,
  isDomainAllowed,
  isSubdomainOfAllowedDomain,
  getTabDomain,
  isSpecialPage,
} from './domain';

// Domain Validation
export {
  validateDomainInput,
  sanitizeSearchQuery,
  isValidSearchQuery,
  type DomainValidationResult,
} from './domain/validation';

// Version
export {
  getVersion,
  getFormattedVersion,
} from './version';

// Array Chunking
export {
  CHUNKING_THRESHOLD,
  INITIAL_CHUNK_SIZE,
  CHUNK_SIZE,
  chunkArray,
  shouldChunkArray,
} from './arrayChunking';

// Event Buckets
export {
  categorizeEvent,
  getBucketConfig,
  getBucketColor,
  DEFAULT_EVENT_BUCKETS,
  type EventBucket,
  type EventBucketConfig,
} from './eventBuckets';
