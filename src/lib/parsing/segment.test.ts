import { describe, it, expect, vi } from 'vitest';

import type {
  SegmentProvider,
  SegmentBatchEvent,
  SegmentBatchPayload,
} from '@src/types/segment';

import {
  detectProvider,
  decodeRequestBody,
  parseSegmentPayload,
  isValidBatchEvent,
  getEventName,
  normalizeEvent,
  processBatchPayload,
} from './segment';

// Mock the logger
vi.mock('@src/lib/logger', () => ({
  createContextLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

describe('parsing/segment.ts', () => {
  describe('detectProvider', () => {
    it('should detect Segment provider from segment.io URL', () => {
      expect(detectProvider('https://api.segment.io/v1/batch')).toBe('segment');
    });

    it('should detect Segment provider from segment.com URL', () => {
      expect(detectProvider('https://api.segment.com/v1/batch')).toBe(
        'segment'
      );
    });

    it('should detect RudderStack provider', () => {
      expect(detectProvider('https://api.rudderstack.com/v1/batch')).toBe(
        'rudderstack'
      );
    });

    it('should detect DreamData provider', () => {
      expect(detectProvider('https://tracking.dreamdata.cloud/v1/batch')).toBe(
        'dreamdata'
      );
    });

    it('should return unknown for unrecognized URLs', () => {
      expect(detectProvider('https://example.com/api')).toBe('unknown');
      expect(detectProvider('https://google.com')).toBe('unknown');
      expect(detectProvider('')).toBe('unknown');
    });

    it('should handle URLs with query parameters', () => {
      expect(detectProvider('https://api.segment.io/v1/batch?key=value')).toBe(
        'segment'
      );
      expect(
        detectProvider('https://api.rudderstack.com/v1/batch?writeKey=abc')
      ).toBe('rudderstack');
    });
  });

  describe('decodeRequestBody', () => {
    // Helper to create a proper ArrayBuffer that will pass instanceof check
    const createArrayBuffer = (text: string): ArrayBuffer => {
      const encoder = new TextEncoder();
      const encoded = encoder.encode(text);
      // Create a new ArrayBuffer and copy the data to ensure it passes instanceof check
      const buffer = new ArrayBuffer(encoded.length);
      new Uint8Array(buffer).set(encoded);
      return buffer;
    };

    it('should decode valid ArrayBuffer request body', () => {
      const text = '{"batch":[],"sentAt":"2024-01-01T00:00:00Z"}';
      const arrayBuffer = createArrayBuffer(text);

      const result = decodeRequestBody([{ bytes: arrayBuffer }]);
      expect(result).toBe(text);
    });

    it('should decode multiple ArrayBuffer parts', () => {
      const parts = [
        '{"batch":',
        '[{"type":"track"}],',
        '"sentAt":"2024-01-01T00:00:00Z"}',
      ];
      const raw = parts.map((part) => ({
        bytes: createArrayBuffer(part),
      }));

      const result = decodeRequestBody(raw);
      expect(result).toBe(parts.join(''));
    });

    it('should filter out non-ArrayBuffer parts', () => {
      const text = '{"batch":[]}';
      const arrayBuffer = createArrayBuffer(text);

      const result = decodeRequestBody([
        { bytes: arrayBuffer },
        { file: 'some-file.txt' },
        { bytes: null },
      ]);
      expect(result).toBe(text);
    });

    it('should return null for empty array', () => {
      expect(decodeRequestBody([])).toBeNull();
    });

    it('should return null for null/undefined input', () => {
      expect(
        decodeRequestBody(
          null as unknown as Array<{ bytes?: unknown; file?: string }>
        )
      ).toBeNull();
      expect(
        decodeRequestBody(
          undefined as unknown as Array<{ bytes?: unknown; file?: string }>
        )
      ).toBeNull();
    });

    it('should return null when no valid ArrayBuffer parts exist', () => {
      expect(decodeRequestBody([{ file: 'test.txt' }])).toBeNull();
      expect(decodeRequestBody([{ bytes: null }])).toBeNull();
    });

    it('should handle decoding errors gracefully', () => {
      // Create an invalid ArrayBuffer that might cause decoding issues
      const invalidBuffer = new ArrayBuffer(0);
      const result = decodeRequestBody([{ bytes: invalidBuffer }]);
      // Should not throw, but might return empty string or handle gracefully
      expect(result).toBe('');
    });
  });

  describe('parseSegmentPayload', () => {
    it('should parse valid batch payload', () => {
      const payload: SegmentBatchPayload = {
        batch: [
          {
            type: 'track',
            event: 'Test Event',
            messageId: 'msg-123',
          },
        ],
        sentAt: '2024-01-01T00:00:00Z',
      };

      const result = parseSegmentPayload(JSON.stringify(payload));
      expect(result).toEqual(payload);
    });

    it('should parse single event and convert to batch format', () => {
      const singleEvent: SegmentBatchEvent = {
        type: 'track',
        event: 'Single Event',
        messageId: 'msg-456',
      };

      const result = parseSegmentPayload(JSON.stringify(singleEvent));
      expect(result).not.toBeNull();
      expect(result?.batch).toHaveLength(1);
      expect(result?.batch[0]).toEqual(singleEvent);
      expect(result?.sentAt).toBeDefined();
    });

    it('should handle all event types in single event format', () => {
      const eventTypes: Array<SegmentBatchEvent['type']> = [
        'track',
        'page',
        'screen',
        'identify',
        'group',
        'alias',
      ];

      eventTypes.forEach((type) => {
        const event = { type, messageId: `msg-${type}` };
        const result = parseSegmentPayload(JSON.stringify(event));
        expect(result).not.toBeNull();
        expect(result?.batch[0].type).toBe(type);
      });
    });

    it('should return null for invalid JSON', () => {
      expect(parseSegmentPayload('invalid json')).toBeNull();
      expect(parseSegmentPayload('{invalid}')).toBeNull();
      expect(parseSegmentPayload('')).toBeNull();
    });

    it('should return null for non-object payload', () => {
      expect(parseSegmentPayload('"string"')).toBeNull();
      expect(parseSegmentPayload('123')).toBeNull();
      expect(parseSegmentPayload('true')).toBeNull();
      expect(parseSegmentPayload('null')).toBeNull();
      expect(parseSegmentPayload('[]')).toBeNull();
    });

    it('should return null for payload without batch array', () => {
      const invalidPayload = {
        sentAt: '2024-01-01T00:00:00Z',
        // missing batch
      };
      expect(parseSegmentPayload(JSON.stringify(invalidPayload))).toBeNull();
    });

    it('should return null for payload with empty batch array', () => {
      const invalidPayload: SegmentBatchPayload = {
        batch: [],
        sentAt: '2024-01-01T00:00:00Z',
      };
      expect(parseSegmentPayload(JSON.stringify(invalidPayload))).toBeNull();
    });

    it('should return null for payload with invalid event type', () => {
      const invalidPayload = {
        batch: [
          {
            type: 'invalid-type',
            messageId: 'msg-123',
          },
        ],
        sentAt: '2024-01-01T00:00:00Z',
      };
      expect(parseSegmentPayload(JSON.stringify(invalidPayload))).toBeNull();
    });

    it('should return null for payload with event missing type', () => {
      const invalidPayload = {
        batch: [
          {
            messageId: 'msg-123',
            // missing type
          },
        ],
        sentAt: '2024-01-01T00:00:00Z',
      };
      expect(parseSegmentPayload(JSON.stringify(invalidPayload))).toBeNull();
    });

    it('should handle payload with optional fields', () => {
      const payload: SegmentBatchPayload = {
        batch: [
          {
            type: 'track',
            event: 'Test',
            // messageId is optional
          },
        ],
        sentAt: '2024-01-01T00:00:00Z',
        writeKey: 'optional-key',
      };
      const result = parseSegmentPayload(JSON.stringify(payload));
      expect(result).toEqual(payload);
    });

    it('should handle batch with multiple events', () => {
      const payload: SegmentBatchPayload = {
        batch: [
          { type: 'track', event: 'Event 1', messageId: 'msg-1' },
          { type: 'page', name: 'Page 1', messageId: 'msg-2' },
          { type: 'identify', userId: 'user-1', messageId: 'msg-3' },
        ],
        sentAt: '2024-01-01T00:00:00Z',
      };
      const result = parseSegmentPayload(JSON.stringify(payload));
      expect(result).toEqual(payload);
    });
  });

  describe('isValidBatchEvent', () => {
    it('should validate track event', () => {
      const event: SegmentBatchEvent = {
        type: 'track',
        event: 'Test Event',
        messageId: 'msg-123',
      };
      expect(isValidBatchEvent(event)).toBe(true);
    });

    it('should validate all event types', () => {
      const eventTypes: Array<SegmentBatchEvent['type']> = [
        'track',
        'page',
        'screen',
        'identify',
        'group',
        'alias',
      ];

      eventTypes.forEach((type) => {
        const event = { type, messageId: `msg-${type}` };
        expect(isValidBatchEvent(event)).toBe(true);
      });
    });

    it('should return false for invalid event type', () => {
      expect(
        isValidBatchEvent({ type: 'invalid' } as unknown as SegmentBatchEvent)
      ).toBe(false);
      expect(
        isValidBatchEvent({ type: 'custom' } as unknown as SegmentBatchEvent)
      ).toBe(false);
    });

    it('should return false for missing type', () => {
      expect(
        isValidBatchEvent({
          messageId: 'msg-123',
        } as unknown as SegmentBatchEvent)
      ).toBe(false);
    });

    it('should return false for non-string type', () => {
      expect(
        isValidBatchEvent({ type: 123 } as unknown as SegmentBatchEvent)
      ).toBe(false);
      expect(
        isValidBatchEvent({ type: null } as unknown as SegmentBatchEvent)
      ).toBe(false);
      expect(
        isValidBatchEvent({ type: {} } as unknown as SegmentBatchEvent)
      ).toBe(false);
    });

    it('should return false for null/undefined', () => {
      expect(isValidBatchEvent(null)).toBe(false);
      expect(isValidBatchEvent(undefined)).toBe(false);
    });

    it('should return false for non-object types', () => {
      expect(isValidBatchEvent('string' as unknown as SegmentBatchEvent)).toBe(
        false
      );
      expect(isValidBatchEvent(123 as unknown as SegmentBatchEvent)).toBe(
        false
      );
      expect(isValidBatchEvent([] as unknown as SegmentBatchEvent)).toBe(false);
    });

    it('should validate event without messageId (messageId is optional)', () => {
      const event: SegmentBatchEvent = {
        type: 'track',
        event: 'Test Event',
        // messageId is optional
      };
      expect(isValidBatchEvent(event)).toBe(true);
    });
  });

  describe('getEventName', () => {
    it('should return event name for track events', () => {
      const event: SegmentBatchEvent = {
        type: 'track',
        event: 'Button Clicked',
        messageId: 'msg-123',
      };
      expect(getEventName(event)).toBe('Button Clicked');
    });

    it('should return "Unnamed Track" for track events without event name', () => {
      const event: SegmentBatchEvent = {
        type: 'track',
        messageId: 'msg-123',
      };
      expect(getEventName(event)).toBe('Unnamed Track');
    });

    it('should return formatted name for page events', () => {
      const event: SegmentBatchEvent = {
        type: 'page',
        name: 'Home Page',
        messageId: 'msg-123',
      };
      expect(getEventName(event)).toBe('Page: Home Page');
    });

    it('should return "Page View" for page events without name', () => {
      const event: SegmentBatchEvent = {
        type: 'page',
        messageId: 'msg-123',
      };
      expect(getEventName(event)).toBe('Page View');
    });

    it('should return formatted name for screen events', () => {
      const event: SegmentBatchEvent = {
        type: 'screen',
        name: 'Dashboard Screen',
        messageId: 'msg-123',
      };
      expect(getEventName(event)).toBe('Screen: Dashboard Screen');
    });

    it('should return "Screen View" for screen events without name', () => {
      const event: SegmentBatchEvent = {
        type: 'screen',
        messageId: 'msg-123',
      };
      expect(getEventName(event)).toBe('Screen View');
    });

    it('should return formatted name for identify events', () => {
      const event: SegmentBatchEvent = {
        type: 'identify',
        userId: 'user-123',
        messageId: 'msg-123',
      };
      expect(getEventName(event)).toBe('Identify: user-123');
    });

    it('should return "Identify" for identify events without userId', () => {
      const event: SegmentBatchEvent = {
        type: 'identify',
        messageId: 'msg-123',
      };
      expect(getEventName(event)).toBe('Identify');
    });

    it('should return formatted name for group events', () => {
      const event: SegmentBatchEvent = {
        type: 'group',
        groupId: 'group-123',
        messageId: 'msg-123',
      };
      expect(getEventName(event)).toBe('Group: group-123');
    });

    it('should return "Group" for group events without groupId', () => {
      const event: SegmentBatchEvent = {
        type: 'group',
        messageId: 'msg-123',
      };
      expect(getEventName(event)).toBe('Group');
    });

    it('should return "Alias" for alias events', () => {
      const event: SegmentBatchEvent = {
        type: 'alias',
        messageId: 'msg-123',
      };
      expect(getEventName(event)).toBe('Alias');
    });

    it('should return "Unknown" for unknown event types', () => {
      const event = {
        type: 'unknown',
        messageId: 'msg-123',
      } as unknown as SegmentBatchEvent;
      expect(getEventName(event)).toBe('Unknown');
    });
  });

  describe('normalizeEvent', () => {
    const baseParams = {
      tabId: 1,
      url: 'https://example.com',
      sentAt: '2024-01-01T00:00:00Z',
      provider: 'segment' as SegmentProvider,
    };

    it('should normalize track event with all fields', () => {
      const batchEvent: SegmentBatchEvent = {
        type: 'track',
        event: 'Test Event',
        properties: { key: 'value' },
        messageId: 'msg-123',
        timestamp: '2024-01-01T00:00:00Z',
        context: {
          library: { name: 'analytics.js', version: '1.0.0' },
        },
        anonymousId: 'anon-123',
        userId: 'user-123',
      };

      const result = normalizeEvent(
        batchEvent,
        baseParams.tabId,
        baseParams.url,
        baseParams.sentAt,
        baseParams.provider
      );

      expect(result.id).toBe('msg-123');
      expect(result.messageId).toBe('msg-123');
      expect(result.type).toBe('track');
      expect(result.name).toBe('Test Event');
      expect(result.properties).toEqual({ key: 'value' });
      expect(result.timestamp).toBe('2024-01-01T00:00:00Z');
      expect(result.sentAt).toBe(baseParams.sentAt);
      expect(result.context).toEqual(batchEvent.context);
      expect(result.anonymousId).toBe('anon-123');
      expect(result.userId).toBe('user-123');
      expect(result.tabId).toBe(baseParams.tabId);
      expect(result.url).toBe(baseParams.url);
      expect(result.provider).toBe(baseParams.provider);
      expect(result.rawPayload).toEqual(batchEvent);
      expect(result.capturedAt).toBeGreaterThan(0);
    });

    it('should generate messageId when missing', () => {
      const batchEvent: SegmentBatchEvent = {
        type: 'track',
        event: 'Test Event',
        // messageId is missing
      };

      const result = normalizeEvent(
        batchEvent,
        baseParams.tabId,
        baseParams.url,
        baseParams.sentAt,
        baseParams.provider
      );

      expect(result.id).toBeDefined();
      expect(result.messageId).toBeDefined();
      expect(result.id).toMatch(/^generated_\d+_[a-z0-9]+$/);
      expect(result.messageId).toBe(result.id);
    });

    it('should use generated timestamp when missing', () => {
      const batchEvent: SegmentBatchEvent = {
        type: 'track',
        event: 'Test Event',
        messageId: 'msg-123',
        // timestamp is missing
      };

      const result = normalizeEvent(
        batchEvent,
        baseParams.tabId,
        baseParams.url,
        baseParams.sentAt,
        baseParams.provider
      );

      expect(result.timestamp).toBeDefined();
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should use default context when missing', () => {
      const batchEvent: SegmentBatchEvent = {
        type: 'track',
        event: 'Test Event',
        messageId: 'msg-123',
        // context is missing
      };

      const result = normalizeEvent(
        batchEvent,
        baseParams.tabId,
        baseParams.url,
        baseParams.sentAt,
        baseParams.provider
      );

      expect(result.context).toEqual({
        library: { name: 'unknown', version: 'unknown' },
      });
    });

    it('should handle all event types', () => {
      const eventTypes: Array<SegmentBatchEvent['type']> = [
        'track',
        'page',
        'screen',
        'identify',
        'group',
        'alias',
      ];

      eventTypes.forEach((type) => {
        const batchEvent: SegmentBatchEvent = {
          type,
          messageId: `msg-${type}`,
        };

        const result = normalizeEvent(
          batchEvent,
          baseParams.tabId,
          baseParams.url,
          baseParams.sentAt,
          baseParams.provider
        );

        expect(result.type).toBe(type);
        expect(result.id).toBe(`msg-${type}`);
      });
    });

    it('should handle group events with groupId', () => {
      const batchEvent: SegmentBatchEvent = {
        type: 'group',
        groupId: 'group-123',
        traits: { name: 'Team A' },
        messageId: 'msg-123',
      };

      const result = normalizeEvent(
        batchEvent,
        baseParams.tabId,
        baseParams.url,
        baseParams.sentAt,
        baseParams.provider
      );

      expect(result.type).toBe('group');
      expect(result.groupId).toBe('group-123');
      expect(result.traits).toEqual({ name: 'Team A' });
    });

    it('should handle identify events with traits', () => {
      const batchEvent: SegmentBatchEvent = {
        type: 'identify',
        userId: 'user-123',
        traits: { email: 'test@example.com', name: 'Test User' },
        messageId: 'msg-123',
      };

      const result = normalizeEvent(
        batchEvent,
        baseParams.tabId,
        baseParams.url,
        baseParams.sentAt,
        baseParams.provider
      );

      expect(result.type).toBe('identify');
      expect(result.userId).toBe('user-123');
      expect(result.traits).toEqual({
        email: 'test@example.com',
        name: 'Test User',
      });
    });

    it('should handle integrations field', () => {
      const batchEvent: SegmentBatchEvent = {
        type: 'track',
        event: 'Test Event',
        messageId: 'msg-123',
        integrations: {
          GoogleAnalytics: true,
          Mixpanel: { track: true },
        },
      };

      const result = normalizeEvent(
        batchEvent,
        baseParams.tabId,
        baseParams.url,
        baseParams.sentAt,
        baseParams.provider
      );

      expect(result.integrations).toEqual(batchEvent.integrations);
    });

    it('should handle different providers', () => {
      const providers: SegmentProvider[] = [
        'segment',
        'rudderstack',
        'dreamdata',
        'unknown',
      ];

      providers.forEach((provider) => {
        const batchEvent: SegmentBatchEvent = {
          type: 'track',
          event: 'Test Event',
          messageId: 'msg-123',
        };

        const result = normalizeEvent(
          batchEvent,
          baseParams.tabId,
          baseParams.url,
          baseParams.sentAt,
          provider
        );

        expect(result.provider).toBe(provider);
      });
    });

    it('should set capturedAt to current timestamp', () => {
      const before = Date.now();
      const batchEvent: SegmentBatchEvent = {
        type: 'track',
        event: 'Test Event',
        messageId: 'msg-123',
      };

      const result = normalizeEvent(
        batchEvent,
        baseParams.tabId,
        baseParams.url,
        baseParams.sentAt,
        baseParams.provider
      );

      const after = Date.now();
      expect(result.capturedAt).toBeGreaterThanOrEqual(before);
      expect(result.capturedAt).toBeLessThanOrEqual(after);
    });

    it('should handle empty properties object', () => {
      const batchEvent: SegmentBatchEvent = {
        type: 'track',
        event: 'Test Event',
        properties: {},
        messageId: 'msg-123',
      };

      const result = normalizeEvent(
        batchEvent,
        baseParams.tabId,
        baseParams.url,
        baseParams.sentAt,
        baseParams.provider
      );

      expect(result.properties).toEqual({});
    });
  });

  describe('processBatchPayload', () => {
    const baseParams = {
      tabId: 1,
      url: 'https://example.com',
      provider: 'segment' as SegmentProvider,
    };

    it('should process valid batch payload', () => {
      const payload: SegmentBatchPayload = {
        batch: [
          {
            type: 'track',
            event: 'Event 1',
            messageId: 'msg-1',
          },
          {
            type: 'page',
            name: 'Page 1',
            messageId: 'msg-2',
          },
        ],
        sentAt: '2024-01-01T00:00:00Z',
      };

      const result = processBatchPayload(
        payload,
        baseParams.tabId,
        baseParams.url,
        baseParams.provider
      );

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('track');
      expect(result[0].name).toBe('Event 1');
      expect(result[1].type).toBe('page');
      expect(result[1].name).toBe('Page: Page 1');
    });

    it('should filter out invalid events', () => {
      const payload: SegmentBatchPayload = {
        batch: [
          {
            type: 'track',
            event: 'Valid Event',
            messageId: 'msg-1',
          },
          {
            type: 'invalid-type',
            messageId: 'msg-2',
          } as unknown as SegmentBatchEvent,
          {
            type: 'page',
            name: 'Valid Page',
            messageId: 'msg-3',
          },
        ],
        sentAt: '2024-01-01T00:00:00Z',
      };

      const result = processBatchPayload(
        payload,
        baseParams.tabId,
        baseParams.url,
        baseParams.provider
      );

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('track');
      expect(result[1].type).toBe('page');
    });

    it('should handle empty batch', () => {
      const payload: SegmentBatchPayload = {
        batch: [],
        sentAt: '2024-01-01T00:00:00Z',
      };

      const result = processBatchPayload(
        payload,
        baseParams.tabId,
        baseParams.url,
        baseParams.provider
      );

      expect(result).toHaveLength(0);
    });

    it('should handle batch with all invalid events', () => {
      const payload: SegmentBatchPayload = {
        batch: [
          {
            type: 'invalid',
            messageId: 'msg-1',
          } as unknown as SegmentBatchEvent,
          {
            type: 'custom',
            messageId: 'msg-2',
          } as unknown as SegmentBatchEvent,
        ],
        sentAt: '2024-01-01T00:00:00Z',
      };

      const result = processBatchPayload(
        payload,
        baseParams.tabId,
        baseParams.url,
        baseParams.provider
      );

      expect(result).toHaveLength(0);
    });

    it('should preserve sentAt timestamp for all events', () => {
      const payload: SegmentBatchPayload = {
        batch: [
          { type: 'track', event: 'Event 1', messageId: 'msg-1' },
          { type: 'track', event: 'Event 2', messageId: 'msg-2' },
        ],
        sentAt: '2024-01-01T12:00:00Z',
      };

      const result = processBatchPayload(
        payload,
        baseParams.tabId,
        baseParams.url,
        baseParams.provider
      );

      result.forEach((event) => {
        expect(event.sentAt).toBe('2024-01-01T12:00:00Z');
      });
    });

    it('should handle events without messageId', () => {
      const payload: SegmentBatchPayload = {
        batch: [
          {
            type: 'track',
            event: 'Event 1',
            // messageId is missing
          },
        ],
        sentAt: '2024-01-01T00:00:00Z',
      };

      const result = processBatchPayload(
        payload,
        baseParams.tabId,
        baseParams.url,
        baseParams.provider
      );

      expect(result).toHaveLength(1);
      expect(result[0].id).toBeDefined();
      expect(result[0].messageId).toBeDefined();
      expect(result[0].id).toMatch(/^generated_\d+_[a-z0-9]+$/);
    });

    it('should handle large batch payloads', () => {
      const batch: SegmentBatchEvent[] = Array.from(
        { length: 100 },
        (_, i) => ({
          type: 'track',
          event: `Event ${i}`,
          messageId: `msg-${i}`,
        })
      );

      const payload: SegmentBatchPayload = {
        batch,
        sentAt: '2024-01-01T00:00:00Z',
      };

      const result = processBatchPayload(
        payload,
        baseParams.tabId,
        baseParams.url,
        baseParams.provider
      );

      expect(result).toHaveLength(100);
      result.forEach((event, i) => {
        expect(event.type).toBe('track');
        expect(event.name).toBe(`Event ${i}`);
      });
    });

    it('should handle different providers', () => {
      const providers: SegmentProvider[] = [
        'segment',
        'rudderstack',
        'dreamdata',
        'unknown',
      ];

      providers.forEach((provider) => {
        const payload: SegmentBatchPayload = {
          batch: [{ type: 'track', event: 'Test', messageId: 'msg-1' }],
          sentAt: '2024-01-01T00:00:00Z',
        };

        const result = processBatchPayload(
          payload,
          baseParams.tabId,
          baseParams.url,
          provider
        );

        expect(result[0].provider).toBe(provider);
      });
    });
  });
});
