import { describe, it, expect } from 'vitest';

import { createSegmentEvent } from '@src/test/utils';

import {
  formatEventsAsJson,
  formatEventsAsMarkdown,
  DEFAULT_EXPORT_SECTIONS,
} from './exportFormatter';

describe('exportFormatter.ts', () => {
  const mockEvent1 = createSegmentEvent({
    type: 'track',
    name: 'Event 1',
    timestamp: '2024-01-01T10:00:00.000Z',
    capturedAt: 1704103200000, // 2024-01-01T10:00:00Z
    properties: { prop1: 'val1', prop2: 123 },
    context: {
      library: { name: 'analytics.js', version: '4.1.0' },
      page: {
        url: 'https://example.com/page1',
        path: '/page1',
        referrer: '',
        search: '',
        title: 'Page 1',
      },
    },
    url: 'https://example.com/page1',
    rawPayload: {
      event: 'Event 1',
      type: 'track',
      properties: { prop1: 'val1', prop2: 123 },
    } as never,
  });

  const mockEvent2 = createSegmentEvent({
    type: 'page',
    name: 'Page 2',
    timestamp: '2024-01-01T10:05:00.000Z',
    capturedAt: 1704103500000, // 2024-01-01T10:05:00Z
    properties: { title: 'Second Page' },
    context: {
      library: { name: 'analytics.js', version: '4.1.0' },
      page: {
        url: 'https://example.com/page2',
        path: '/page2',
        referrer: '',
        search: '',
        title: 'Page 2',
      },
    },
    url: 'https://example.com/page2',
    rawPayload: {
      name: 'Page 2',
      type: 'page',
      properties: { title: 'Second Page' },
    } as never,
  });

  describe('formatEventsAsJson', () => {
    it('should return empty array string for empty events', () => {
      expect(formatEventsAsJson([])).toBe('[]');
    });

    it('should format events as pretty-printed JSON array of raw payloads', () => {
      const events = [mockEvent1, mockEvent2];
      const result = formatEventsAsJson(events);
      const parsed = JSON.parse(result);

      expect(parsed).toHaveLength(2);
      expect(parsed[0]).toEqual(mockEvent1.rawPayload);
      expect(parsed[1]).toEqual(mockEvent2.rawPayload);
      expect(result).toContain('  "event": "Event 1"');
    });
  });

  describe('formatEventsAsMarkdown', () => {
    it('should return empty string for empty events', () => {
      expect(formatEventsAsMarkdown([], [], DEFAULT_EXPORT_SECTIONS)).toBe('');
    });

    it('should include header with correct domain and event count', () => {
      const events = [mockEvent1];
      const result = formatEventsAsMarkdown(
        events,
        [],
        DEFAULT_EXPORT_SECTIONS
      );

      expect(result).toContain('# Analytics Events Export');
      expect(result).toContain('> 1 events from **example.com**');
      expect(result).toContain(
        'between 2024-01-01T10:00:00.000Z and 2024-01-01T10:00:00.000Z'
      );
    });

    it('should format a single event correctly', () => {
      const result = formatEventsAsMarkdown(
        [mockEvent1],
        [],
        DEFAULT_EXPORT_SECTIONS
      );

      expect(result).toContain('### Event 1 (track)');
      expect(result).toContain('- **Timestamp**: 2024-01-01T10:00:00.000Z');
      expect(result).toContain('- **Properties**:');
      expect(result).toContain('  - prop1: val1');
      expect(result).toContain('  - prop2: 123');
    });

    it('should include navigation divider when URL changes', () => {
      const events = [mockEvent1, mockEvent2];
      const result = formatEventsAsMarkdown(
        events,
        [],
        DEFAULT_EXPORT_SECTIONS
      );

      expect(result).toContain('---');
      expect(result).toContain('**Navigated to /page2**');
    });

    it('should include page reload divider when reload timestamp is between events', () => {
      const eventSameUrl = createSegmentEvent({
        ...mockEvent1,
        timestamp: '2024-01-01T10:10:00.000Z',
        capturedAt: 1704103800000,
        id: 'msg-3',
        messageId: 'msg-3',
      });
      const reloadTimestamps = [1704103500000]; // Between mockEvent1 and eventSameUrl

      const result = formatEventsAsMarkdown(
        [mockEvent1, eventSameUrl],
        reloadTimestamps,
        DEFAULT_EXPORT_SECTIONS
      );

      expect(result).toContain('---');
      expect(result).toContain('**Page Reload**');
    });

    it('should respect export sections toggles', () => {
      const sectionsWithoutProperties = {
        ...DEFAULT_EXPORT_SECTIONS,
        properties: false,
      };

      const result = formatEventsAsMarkdown(
        [mockEvent1],
        [],
        sectionsWithoutProperties
      );

      expect(result).toContain('### Event 1 (track)');
      expect(result).not.toContain('- **Properties**:');
      expect(result).not.toContain('  - prop1: val1');
    });

    it('should format traits for identify events', () => {
      const identifyEvent = createSegmentEvent({
        type: 'identify',
        name: 'Identify',
        traits: { email: 'test@example.com', plan: 'pro' },
      });

      const result = formatEventsAsMarkdown(
        [identifyEvent],
        [],
        DEFAULT_EXPORT_SECTIONS
      );

      expect(result).toContain('- **Traits**:');
      expect(result).toContain('  - email: test@example.com');
      expect(result).toContain('  - plan: pro');
    });

    it('should format context subsections when enabled', () => {
      const eventWithContext = createSegmentEvent({
        context: {
          library: { name: 'analytics-node', version: '2.0.0' },
          page: {
            path: '/test',
            url: 'https://example.com/test',
            title: 'Test',
            referrer: '',
            search: '',
          },
          userAgent: 'Mozilla/5.0',
        },
      });

      const result = formatEventsAsMarkdown(
        [eventWithContext],
        [],
        DEFAULT_EXPORT_SECTIONS
      );

      expect(result).toContain('- **Page**:');
      expect(result).toContain('  - path: /test');
      expect(result).toContain('- **Library**:');
      expect(result).toContain('  - name: analytics-node');
      expect(result).toContain('- **Browser**:');
      expect(result).toContain('  - userAgent: Mozilla/5.0');
    });

    it('should hide context subsections when parent context is disabled', () => {
      const eventWithContext = createSegmentEvent({
        context: {
          library: { name: 'analytics.js', version: '4.1.0' },
          page: {
            path: '/test',
            url: 'https://example.com/test',
            title: 'Test',
            referrer: '',
            search: '',
          },
        },
      });

      const sectionsNoContext = {
        ...DEFAULT_EXPORT_SECTIONS,
        context: false,
      };

      const result = formatEventsAsMarkdown(
        [eventWithContext],
        [],
        sectionsNoContext
      );

      expect(result).not.toContain('- **Page**:');
    });

    it('should format identifiers in metadata', () => {
      const eventWithIds = createSegmentEvent({
        userId: 'user-123',
        anonymousId: 'anon-456',
        messageId: 'msg-789',
      });

      const result = formatEventsAsMarkdown(
        [eventWithIds],
        [],
        DEFAULT_EXPORT_SECTIONS
      );

      expect(result).toContain('- **Identifiers**:');
      expect(result).toContain('  - userId: user-123');
      expect(result).toContain('  - anonymousId: anon-456');
      expect(result).toContain('  - messageId: msg-789');
    });

    it('should format capture info in metadata', () => {
      const event = createSegmentEvent({
        url: 'https://example.com/test',
        provider: 'segment',
        capturedAt: 1704103200000,
      });

      const result = formatEventsAsMarkdown(
        [event],
        [],
        DEFAULT_EXPORT_SECTIONS
      );

      expect(result).toContain('- **Capture Info**:');
      expect(result).toContain('  - captureUrl: https://example.com/test');
      expect(result).toContain('  - provider: segment');
      expect(result).toContain('  - capturedAt: 2024-01-01T10:00:00.000Z');
    });
  });
});
