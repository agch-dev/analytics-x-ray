/**
 * Storage Size Monitoring Utilities
 * 
 * Provides functions for monitoring and reporting storage usage.
 */

import Browser from 'webextension-polyfill';

/**
 * Storage size constants
 */
const STORAGE_LIMIT_BYTES = 10 * 1024 * 1024; // 10 MB Chrome extension limit

/**
 * Format bytes to human readable string
 */
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

/**
 * Storage size breakdown by key category
 */
export interface StorageSizeInfo {
  totalBytes: number;
  totalFormatted: string;
  limitBytes: number;
  limitFormatted: string;
  usagePercent: number;
  isNearLimit: boolean;
  isOverLimit: boolean;
  breakdown: {
    key: string;
    bytes: number;
    formatted: string;
    percent: number;
  }[];
}

/**
 * Get detailed storage size information
 * Provides breakdown by key and warnings if approaching limit
 */
export const getStorageSizeInfo = async (): Promise<StorageSizeInfo> => {
  try {
    const allStorage = await Browser.storage.local.get(null);
    
    const breakdown: StorageSizeInfo['breakdown'] = [];
    let totalBytes = 0;
    
    for (const [key, value] of Object.entries(allStorage)) {
      const serialized = JSON.stringify(value);
      const bytes = new Blob([serialized]).size;
      totalBytes += bytes;
      breakdown.push({
        key,
        bytes,
        formatted: formatBytes(bytes),
        percent: 0, // Will calculate after total
      });
    }
    
    // Calculate percentages
    for (const item of breakdown) {
      item.percent = totalBytes > 0 ? (item.bytes / totalBytes) * 100 : 0;
    }
    
    // Sort by size descending
    breakdown.sort((a, b) => b.bytes - a.bytes);
    
    const usagePercent = (totalBytes / STORAGE_LIMIT_BYTES) * 100;
    
    return {
      totalBytes,
      totalFormatted: formatBytes(totalBytes),
      limitBytes: STORAGE_LIMIT_BYTES,
      limitFormatted: formatBytes(STORAGE_LIMIT_BYTES),
      usagePercent,
      isNearLimit: usagePercent >= 80,
      isOverLimit: usagePercent >= 100,
      breakdown,
    };
  } catch (error) {
    console.error('Failed to get storage size:', error);
    return {
      totalBytes: 0,
      totalFormatted: '0 B',
      limitBytes: STORAGE_LIMIT_BYTES,
      limitFormatted: formatBytes(STORAGE_LIMIT_BYTES),
      usagePercent: 0,
      isNearLimit: false,
      isOverLimit: false,
      breakdown: [],
    };
  }
};

/**
 * Log storage size with detailed breakdown
 * Call this periodically or when debugging storage issues
 * Only logs in development mode to avoid cluttering production console
 */
export const logStorageSize = async (context: string = 'storage'): Promise<StorageSizeInfo> => {
  const info = await getStorageSizeInfo();
  
  // Only log in development mode
  if (!__DEV_MODE__) {
    return info;
  }
  
  const prefix = '[analytics-x-ray]';
  const contextTag = `[${context}]`;
  
  // Determine log level based on usage
  const logFn = info.isOverLimit 
    ? console.error 
    : info.isNearLimit 
      ? console.warn 
      : console.log;
  
  // Header
  logFn(
    `%c${prefix} ${contextTag}%c 📊 Storage Usage: ${info.totalFormatted} / ${info.limitFormatted} (${info.usagePercent.toFixed(1)}%)`,
    `color: #fdcb6e; font-weight: bold`,
    'color: inherit',
    info.isNearLimit ? '⚠️ NEAR LIMIT' : '',
    info.isOverLimit ? '🚨 OVER LIMIT' : ''
  );
  
  // Only show breakdown if there's significant usage or near limit
  if (info.usagePercent > 10 || info.isNearLimit) {
    console.group(`%c${prefix} ${contextTag}%c Storage breakdown:`, 
      'color: #fdcb6e; font-weight: bold', 
      'color: inherit'
    );
    
    // Show top 10 keys by size
    const topKeys = info.breakdown.slice(0, 10);
    for (const item of topKeys) {
      const bar = '█'.repeat(Math.ceil(item.percent / 5)) + '░'.repeat(20 - Math.ceil(item.percent / 5));
      console.log(
        `  ${bar} ${item.formatted.padStart(10)} (${item.percent.toFixed(1)}%) - ${item.key}`
      );
    }
    
    if (info.breakdown.length > 10) {
      const remaining = info.breakdown.slice(10);
      const remainingBytes = remaining.reduce((sum, item) => sum + item.bytes, 0);
      console.log(`  ... and ${remaining.length} more keys (${formatBytes(remainingBytes)} total)`);
    }
    
    console.groupEnd();
  }
  
  return info;
};
