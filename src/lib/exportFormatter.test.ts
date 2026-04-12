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
      expect(result).toContain('> 1 event from **example.com**');
      expect(result).toContain(
        'between 2024-01-01T10:00:00.000Z and 2024-01-01T10:00:00.000Z'
      );
    });

    it('should use plural "events" for multiple events in the header', () => {
      const events = [mockEvent1, mockEvent2];
      const result = formatEventsAsMarkdown(
        events,
        [],
        DEFAULT_EXPORT_SECTIONS
      );

      expect(result).toContain('> 2 events from **example.com**');
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

    it('should hide traits when traits section is disabled', () => {
      const identifyEvent = createSegmentEvent({
        type: 'identify',
        name: 'Identify',
        traits: { email: 'test@example.com', plan: 'pro' },
      });

      const sectionsNoTraits = {
        ...DEFAULT_EXPORT_SECTIONS,
        traits: false,
      };

      const result = formatEventsAsMarkdown(
        [identifyEvent],
        [],
        sectionsNoTraits
      );

      expect(result).not.toContain('- **Traits**:');
      expect(result).not.toContain('  - email: test@example.com');
    });

    it('should hide individual context subsection when its toggle is off but parent is on', () => {
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

      const sectionsNoPage = {
        ...DEFAULT_EXPORT_SECTIONS,
        context: true,
        contextPage: false,
      };

      const result = formatEventsAsMarkdown(
        [eventWithContext],
        [],
        sectionsNoPage
      );

      expect(result).not.toContain('- **Page**:');
      expect(result).toContain('- **Library**:');
    });

    it('should hide individual metadata subsection when its toggle is off but parent is on', () => {
      const event = createSegmentEvent({
        userId: 'user-123',
        anonymousId: 'anon-456',
        url: 'https://example.com/test',
        provider: 'segment',
        capturedAt: 1704103200000,
      });

      const sectionsNoIdentifiers = {
        ...DEFAULT_EXPORT_SECTIONS,
        metadata: true,
        metadataIdentifiers: false,
      };

      const result = formatEventsAsMarkdown([event], [], sectionsNoIdentifiers);

      expect(result).not.toContain('- **Identifiers**:');
      expect(result).not.toContain('  - userId: user-123');
      expect(result).toContain('- **Capture Info**:');
    });

    it('should hide all metadata subsections when parent metadata is disabled', () => {
      const event = createSegmentEvent({
        userId: 'user-123',
        url: 'https://example.com/test',
        provider: 'segment',
        capturedAt: 1704103200000,
        integrations: { Amplitude: true } as never,
      });

      const sectionsNoMetadata = {
        ...DEFAULT_EXPORT_SECTIONS,
        metadata: false,
      };

      const result = formatEventsAsMarkdown([event], [], sectionsNoMetadata);

      expect(result).not.toContain('- **Identifiers**:');
      expect(result).not.toContain('- **Capture Info**:');
      expect(result).not.toContain('- **Integrations**:');
    });

    it('should only output header and event name/timestamp when all sections are disabled', () => {
      const allOff: typeof DEFAULT_EXPORT_SECTIONS = {
        properties: false,
        traits: false,
        context: false,
        contextPage: false,
        contextLibrary: false,
        contextBrowser: false,
        contextOther: false,
        metadata: false,
        metadataIdentifiers: false,
        metadataCaptureInfo: false,
        metadataIntegrations: false,
      };

      const result = formatEventsAsMarkdown([mockEvent1], [], allOff);

      expect(result).toContain('# Analytics Events Export');
      expect(result).toContain('### Event 1 (track)');
      expect(result).toContain('- **Timestamp**:');
      expect(result).not.toContain('- **Properties**:');
      expect(result).not.toContain('- **Traits**:');
      expect(result).not.toContain('- **Page**:');
      expect(result).not.toContain('- **Library**:');
      expect(result).not.toContain('- **Browser**:');
      expect(result).not.toContain('- **Identifiers**:');
      expect(result).not.toContain('- **Capture Info**:');
      expect(result).not.toContain('- **Integrations**:');
    });

    // ====================================================================
    // Integrations & Other Context
    // ====================================================================

    it('should format integrations in metadata', () => {
      const event = createSegmentEvent({
        integrations: { Amplitude: true, Mixpanel: false } as never,
      });

      const result = formatEventsAsMarkdown(
        [event],
        [],
        DEFAULT_EXPORT_SECTIONS
      );

      expect(result).toContain('- **Integrations**:');
      expect(result).toContain('  - Amplitude: true');
      expect(result).toContain('  - Mixpanel: false');
    });

    it('should format other context keys under Other Context', () => {
      const event = createSegmentEvent({
        context: {
          library: { name: 'analytics.js', version: '4.1.0' },
          locale: 'en-US',
          timezone: 'America/New_York',
        },
      });

      const result = formatEventsAsMarkdown(
        [event],
        [],
        DEFAULT_EXPORT_SECTIONS
      );

      expect(result).toContain('- **Other Context**:');
      expect(result).toContain('  - locale: en-US');
      expect(result).toContain('  - timezone: America/New_York');
    });

    // ====================================================================
    // Value formatting edge cases
    // ====================================================================

    it('should JSON.stringify nested object values in properties', () => {
      const event = createSegmentEvent({
        properties: {
          nested: { foo: 'bar', count: 1 },
          list: [1, 2, 3],
        },
      });

      const result = formatEventsAsMarkdown(
        [event],
        [],
        DEFAULT_EXPORT_SECTIONS
      );

      expect(result).toContain('  - nested: {"foo":"bar","count":1}');
      expect(result).toContain('  - list: [1,2,3]');
    });

    it('should handle null and undefined property values', () => {
      const event = createSegmentEvent({
        properties: {
          nullVal: null,
          definedVal: 'hello',
        },
      });

      const result = formatEventsAsMarkdown(
        [event],
        [],
        DEFAULT_EXPORT_SECTIONS
      );

      expect(result).toContain('  - nullVal: null');
      expect(result).toContain('  - definedVal: hello');
    });

    // ====================================================================
    // Navigation & reload boundary edge cases
    // ====================================================================

    it('should show navigation divider instead of reload when both occur between events', () => {
      const event1 = createSegmentEvent({
        type: 'track',
        name: 'Event A',
        timestamp: '2024-01-01T10:00:00.000Z',
        capturedAt: 1704103200000,
        url: 'https://example.com/page1',
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
        id: 'nav-1',
        messageId: 'nav-1',
      });

      const event2 = createSegmentEvent({
        type: 'track',
        name: 'Event B',
        timestamp: '2024-01-01T10:05:00.000Z',
        capturedAt: 1704103500000,
        url: 'https://example.com/page2',
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
        id: 'nav-2',
        messageId: 'nav-2',
      });

      // Reload timestamp between the two events
      const reloadTimestamps = [1704103300000];

      const result = formatEventsAsMarkdown(
        [event1, event2],
        reloadTimestamps,
        DEFAULT_EXPORT_SECTIONS
      );

      expect(result).toContain('**Navigated to /page2**');
      expect(result).not.toContain('**Page Reload**');
    });

    it('should not show reload divider when reload timestamp equals prev event capturedAt', () => {
      const event1 = createSegmentEvent({
        ...mockEvent1,
        id: 'boundary-1',
        messageId: 'boundary-1',
        capturedAt: 1704103200000,
      });

      const event2 = createSegmentEvent({
        ...mockEvent1,
        id: 'boundary-2',
        messageId: 'boundary-2',
        timestamp: '2024-01-01T10:10:00.000Z',
        capturedAt: 1704103800000,
      });

      // Reload timestamp exactly equals prev.capturedAt — should NOT match (ts > prev.capturedAt)
      const reloadTimestamps = [1704103200000];

      const result = formatEventsAsMarkdown(
        [event1, event2],
        reloadTimestamps,
        DEFAULT_EXPORT_SECTIONS
      );

      expect(result).not.toContain('**Page Reload**');
    });

    it('should show reload divider when reload timestamp equals current event capturedAt', () => {
      const event1 = createSegmentEvent({
        ...mockEvent1,
        id: 'boundary-3',
        messageId: 'boundary-3',
        capturedAt: 1704103200000,
      });

      const event2 = createSegmentEvent({
        ...mockEvent1,
        id: 'boundary-4',
        messageId: 'boundary-4',
        timestamp: '2024-01-01T10:10:00.000Z',
        capturedAt: 1704103800000,
      });

      // Reload timestamp exactly equals current.capturedAt — should match (ts <= current.capturedAt)
      const reloadTimestamps = [1704103800000];

      const result = formatEventsAsMarkdown(
        [event1, event2],
        reloadTimestamps,
        DEFAULT_EXPORT_SECTIONS
      );

      expect(result).toContain('**Page Reload**');
    });

    it('should show multiple navigation dividers for 3+ URL changes', () => {
      const events = [
        createSegmentEvent({
          name: 'E1',
          timestamp: '2024-01-01T10:00:00.000Z',
          capturedAt: 1704103200000,
          url: 'https://example.com/a',
          context: {
            library: { name: 'analytics.js', version: '4.1.0' },
            page: {
              url: 'https://example.com/a',
              path: '/a',
              referrer: '',
              search: '',
              title: 'A',
            },
          },
          id: 'multi-1',
          messageId: 'multi-1',
        }),
        createSegmentEvent({
          name: 'E2',
          timestamp: '2024-01-01T10:01:00.000Z',
          capturedAt: 1704103260000,
          url: 'https://example.com/b',
          context: {
            library: { name: 'analytics.js', version: '4.1.0' },
            page: {
              url: 'https://example.com/b',
              path: '/b',
              referrer: '',
              search: '',
              title: 'B',
            },
          },
          id: 'multi-2',
          messageId: 'multi-2',
        }),
        createSegmentEvent({
          name: 'E3',
          timestamp: '2024-01-01T10:02:00.000Z',
          capturedAt: 1704103320000,
          url: 'https://example.com/c',
          context: {
            library: { name: 'analytics.js', version: '4.1.0' },
            page: {
              url: 'https://example.com/c',
              path: '/c',
              referrer: '',
              search: '',
              title: 'C',
            },
          },
          id: 'multi-3',
          messageId: 'multi-3',
        }),
      ];

      const result = formatEventsAsMarkdown(
        events,
        [],
        DEFAULT_EXPORT_SECTIONS
      );

      expect(result).toContain('**Navigated to /b**');
      expect(result).toContain('**Navigated to /c**');
    });

    // ====================================================================
    // Domain extraction
    // ====================================================================

    it('should show "unknown" domain when event has no URL', () => {
      const event = createSegmentEvent({
        url: '',
        context: { library: { name: 'analytics.js', version: '4.1.0' } },
      });

      const result = formatEventsAsMarkdown(
        [event],
        [],
        DEFAULT_EXPORT_SECTIONS
      );

      expect(result).toContain('from **unknown**');
    });
  });
});
