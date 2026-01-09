import { describe, it, expect } from 'vitest';
import {
  categorizeEvent,
  getBucketConfig,
  getBucketColor,
  type EventBucket,
  type EventBucketConfig,
} from './eventBuckets';
import { createSegmentEvent } from '@src/test';
import type { SegmentEvent } from '@src/types/segment';

describe('eventBuckets.ts', () => {
  describe('categorizeEvent', () => {
    describe('event type matching', () => {
      it('should categorize page events by type', () => {
        const event = createSegmentEvent({
          type: 'page',
          name: 'Some Page',
        });
        expect(categorizeEvent(event)).toBe('page');
      });

      it('should categorize identify events by type', () => {
        const event = createSegmentEvent({
          type: 'identify',
          name: 'User Identified',
        });
        expect(categorizeEvent(event)).toBe('identify');
      });

      it('should categorize group events by type', () => {
        const event = createSegmentEvent({
          type: 'group',
          name: 'Group Event',
        });
        expect(categorizeEvent(event)).toBe('identify');
      });

      it('should categorize alias events by type', () => {
        const event = createSegmentEvent({
          type: 'alias',
          name: 'Alias Event',
        });
        expect(categorizeEvent(event)).toBe('identify');
      });
    });

    describe('pattern matching in event names', () => {
      it('should categorize view events by name pattern', () => {
        const event1 = createSegmentEvent({ name: 'Product Viewed' });
        const event2 = createSegmentEvent({ name: 'Page Viewed' });
        const event3 = createSegmentEvent({ name: 'Item Seen' });

        expect(categorizeEvent(event1)).toBe('view');
        expect(categorizeEvent(event2)).toBe('view');
        expect(categorizeEvent(event3)).toBe('view');
      });

      it('should categorize interaction events by name pattern', () => {
        const events = [
          'Button Clicked',
          'Toggle Switched',
          'Option Selected',
          'Form Submitted',
          'Key Pressed',
          'User Interacted',
          'Page Scrolled',
        ];

        events.forEach((eventName) => {
          const event = createSegmentEvent({ name: eventName });
          expect(categorizeEvent(event)).toBe('interaction');
        });
      });

      it('should categorize navigation events by name pattern', () => {
        const events = [
          'User Navigated',
          'Navigation Started',
          'Route Changed',
          'Page Routed',
        ];

        events.forEach((eventName) => {
          const event = createSegmentEvent({ name: eventName });
          expect(categorizeEvent(event)).toBe('navigation');
        });
      });

      it('should categorize conversion events by name pattern', () => {
        const events = [
          'Purchase Completed',
          'Checkout Finished',
          'Order Complete',
          'Payment Completed',
          'Conversion Tracked',
          'User Converted',
          'Order Placed',
          'Payment Paid',
        ];

        events.forEach((eventName) => {
          const event = createSegmentEvent({ name: eventName });
          expect(categorizeEvent(event)).toBe('conversion');
        });
      });

      it('should categorize error events by name pattern', () => {
        const events = [
          'Error Occurred',
          'Operation Failed',
          'Request Failed',
          'Exception Thrown',
          'Warning Displayed',
        ];

        events.forEach((eventName) => {
          const event = createSegmentEvent({ name: eventName });
          expect(categorizeEvent(event)).toBe('error');
        });
      });

      it('should categorize identify events by name pattern', () => {
        const event = createSegmentEvent({
          name: 'User Identify',
          type: 'track', // Not identify type, but matches pattern
        });
        expect(categorizeEvent(event)).toBe('identify');
      });
    });

    describe('case insensitivity', () => {
      it('should match patterns case-insensitively', () => {
        const events = [
          'CLICK BUTTON',
          'Click Button',
          'click button',
          'ClIcK bUtToN',
        ];

        events.forEach((eventName) => {
          const event = createSegmentEvent({ name: eventName });
          expect(categorizeEvent(event)).toBe('interaction');
        });
      });

      it('should match event types case-insensitively in name', () => {
        const event = createSegmentEvent({
          name: 'PAGE LOADED',
          type: 'track', // Not page type, but matches pattern
        });
        // Note: 'page' bucket matches by type only, not pattern
        // So this should fall through to default or other matches
        expect(categorizeEvent(event)).not.toBe('page');
      });
    });

    describe('priority and first match wins', () => {
      it('should prioritize event type match over pattern match', () => {
        // 'identify' type should match before 'view' pattern
        const event = createSegmentEvent({
          type: 'identify',
          name: 'Product Viewed', // Contains 'view' pattern
        });
        expect(categorizeEvent(event)).toBe('identify');
      });

      it('should return first matching bucket in order', () => {
        // Create custom buckets where order matters
        const customBuckets: EventBucketConfig[] = [
          {
            id: 'conversion',
            label: 'Conversions',
            color: 'border-l-green-500',
            patterns: ['purchase', 'order'],
          },
          {
            id: 'interaction',
            label: 'Interactions',
            color: 'border-l-orange-500',
            patterns: ['purchase'], // Also matches 'purchase'
          },
        ];

        const event = createSegmentEvent({ name: 'Purchase Completed' });
        // Should match first bucket (conversion), not second (interaction)
        expect(categorizeEvent(event, customBuckets)).toBe('conversion');
      });
    });

    describe('default bucket fallback', () => {
      it('should return default bucket for unmatched events', () => {
        const event = createSegmentEvent({
          type: 'track',
          name: 'Random Event Name',
        });
        expect(categorizeEvent(event)).toBe('default');
      });

      it('should return default for empty event name', () => {
        const event = createSegmentEvent({
          type: 'track',
          name: '',
        });
        expect(categorizeEvent(event)).toBe('default');
      });

      it('should return default for screen events without matching patterns', () => {
        const event = createSegmentEvent({
          type: 'screen',
          name: 'Home Screen',
        });
        expect(categorizeEvent(event)).toBe('default');
      });
    });

    describe('custom bucket configurations', () => {
      it('should use custom buckets when provided', () => {
        const customBuckets: EventBucketConfig[] = [
          {
            id: 'custom' as EventBucket,
            label: 'Custom Bucket',
            color: 'border-l-pink-500',
            patterns: ['custom'],
          },
          {
            id: 'default',
            label: 'Default',
            color: 'border-l-gray-500',
            patterns: [],
          },
        ];

        const event = createSegmentEvent({ name: 'Custom Event' });
        expect(categorizeEvent(event, customBuckets)).toBe('custom' as EventBucket);
      });

      it('should fall back to default in custom buckets if no match', () => {
        const customBuckets: EventBucketConfig[] = [
          {
            id: 'custom' as EventBucket,
            label: 'Custom Bucket',
            color: 'border-l-pink-500',
            patterns: ['custom'],
          },
          {
            id: 'default',
            label: 'Default',
            color: 'border-l-gray-500',
            patterns: [],
          },
        ];

        const event = createSegmentEvent({ name: 'Unmatched Event' });
        expect(categorizeEvent(event, customBuckets)).toBe('default');
      });

      it('should handle custom buckets with event types', () => {
        const customBuckets: EventBucketConfig[] = [
          {
            id: 'custom-track' as EventBucket,
            label: 'Custom Track',
            color: 'border-l-blue-500',
            patterns: [],
            eventTypes: ['track'],
          },
          {
            id: 'default',
            label: 'Default',
            color: 'border-l-gray-500',
            patterns: [],
          },
        ];

        const event = createSegmentEvent({ type: 'track', name: 'Any Name' });
        expect(categorizeEvent(event, customBuckets)).toBe('custom-track' as EventBucket);
      });
    });

    describe('edge cases', () => {
      it('should handle events with very long names', () => {
        const longName = 'A'.repeat(1000) + ' Click';
        const event = createSegmentEvent({ name: longName });
        expect(categorizeEvent(event)).toBe('interaction');
      });

      it('should handle events with special characters in names', () => {
        const event = createSegmentEvent({ name: 'Click!@#$%^&*()' });
        expect(categorizeEvent(event)).toBe('interaction');
      });

      it('should handle events with numbers in names', () => {
        const event = createSegmentEvent({ name: 'Click 123 Button' });
        expect(categorizeEvent(event)).toBe('interaction');
      });

      it('should handle partial pattern matches', () => {
        // 'click' should match even if it's part of a larger word
        const event = createSegmentEvent({ name: 'unclickable' });
        expect(categorizeEvent(event)).toBe('interaction');
      });
    });
  });

  describe('getBucketConfig', () => {
    it('should return bucket config for valid bucket ID', () => {
      const config = getBucketConfig('page');
      expect(config).toBeDefined();
      expect(config?.id).toBe('page');
      expect(config?.label).toBe('Page Events');
      expect(config?.color).toBe('border-l-emerald-500');
    });

    it('should return bucket config for all default buckets', () => {
      const bucketIds: EventBucket[] = [
        'page',
        'view',
        'interaction',
        'identify',
        'navigation',
        'conversion',
        'error',
        'default',
      ];

      bucketIds.forEach((bucketId) => {
        const config = getBucketConfig(bucketId);
        expect(config).toBeDefined();
        expect(config?.id).toBe(bucketId);
      });
    });

    it('should return undefined for invalid bucket ID', () => {
      // TypeScript won't allow this, but runtime could have issues
      const config = getBucketConfig('invalid' as EventBucket);
      expect(config).toBeUndefined();
    });

    it('should use custom buckets when provided', () => {
      const customBuckets: EventBucketConfig[] = [
        {
          id: 'custom' as EventBucket,
          label: 'Custom Bucket',
          color: 'border-l-pink-500',
          patterns: ['custom'],
        },
      ];

      const config = getBucketConfig('custom' as EventBucket, customBuckets);
      expect(config).toBeDefined();
      expect(config?.id).toBe('custom' as EventBucket);
      expect(config?.label).toBe('Custom Bucket');
    });

    it('should return undefined for bucket not in custom buckets', () => {
      const customBuckets: EventBucketConfig[] = [
        {
          id: 'custom' as EventBucket,
          label: 'Custom Bucket',
          color: 'border-l-pink-500',
          patterns: ['custom'],
        },
      ];

      const config = getBucketConfig('page', customBuckets);
      expect(config).toBeUndefined();
    });
  });

  describe('getBucketColor', () => {
    it('should return color for valid bucket ID', () => {
      expect(getBucketColor('page')).toBe('border-l-emerald-500');
      expect(getBucketColor('identify')).toBe('border-l-purple-500');
      expect(getBucketColor('view')).toBe('border-l-cyan-500');
      expect(getBucketColor('interaction')).toBe('border-l-orange-500');
      expect(getBucketColor('navigation')).toBe('border-l-indigo-500');
      expect(getBucketColor('conversion')).toBe('border-l-green-500');
      expect(getBucketColor('error')).toBe('border-l-red-500');
      expect(getBucketColor('default')).toBe('border-l-gray-500');
    });

    it('should return empty string for invalid bucket ID', () => {
      const color = getBucketColor('invalid' as EventBucket);
      expect(color).toBe('');
    });

    it('should use custom buckets when provided', () => {
      const customBuckets: EventBucketConfig[] = [
        {
          id: 'custom' as EventBucket,
          label: 'Custom Bucket',
          color: 'border-l-pink-500',
          patterns: ['custom'],
        },
      ];

      expect(getBucketColor('custom' as EventBucket, customBuckets)).toBe('border-l-pink-500');
    });

    it('should return empty string for bucket not in custom buckets', () => {
      const customBuckets: EventBucketConfig[] = [
        {
          id: 'custom' as EventBucket,
          label: 'Custom Bucket',
          color: 'border-l-pink-500',
          patterns: ['custom'],
        },
      ];

      expect(getBucketColor('page', customBuckets)).toBe('');
    });

    it('should return empty string when bucket config has no color', () => {
      const customBuckets: EventBucketConfig[] = [
        {
          id: 'no-color' as EventBucket,
          label: 'No Color',
          color: '', // Empty color
          patterns: [],
        },
      ];

      expect(getBucketColor('no-color' as EventBucket, customBuckets)).toBe('');
    });
  });

  describe('integration tests', () => {
    it('should categorize and retrieve config for same event', () => {
      const event = createSegmentEvent({
        type: 'page',
        name: 'Home Page',
      });

      const bucketId = categorizeEvent(event);
      const config = getBucketConfig(bucketId);
      const color = getBucketColor(bucketId);

      expect(bucketId).toBe('page');
      expect(config).toBeDefined();
      expect(config?.id).toBe('page');
      expect(color).toBe('border-l-emerald-500');
    });

    it('should handle full workflow with pattern matching', () => {
      const event = createSegmentEvent({
        name: 'Purchase Completed',
      });

      const bucketId = categorizeEvent(event);
      const config = getBucketConfig(bucketId);
      const color = getBucketColor(bucketId);

      expect(bucketId).toBe('conversion');
      expect(config?.label).toBe('Conversions');
      expect(color).toBe('border-l-green-500');
    });

    it('should work with all default bucket types', () => {
      const testCases: Array<{ event: SegmentEvent; expectedBucket: EventBucket }> = [
        { event: createSegmentEvent({ type: 'page', name: 'Page' }), expectedBucket: 'page' },
        { event: createSegmentEvent({ type: 'identify', name: 'Identify' }), expectedBucket: 'identify' },
        { event: createSegmentEvent({ name: 'Product Viewed' }), expectedBucket: 'view' },
        { event: createSegmentEvent({ name: 'Button Clicked' }), expectedBucket: 'interaction' },
        { event: createSegmentEvent({ name: 'Route Changed' }), expectedBucket: 'navigation' },
        { event: createSegmentEvent({ name: 'Purchase Completed' }), expectedBucket: 'conversion' },
        { event: createSegmentEvent({ name: 'Error Occurred' }), expectedBucket: 'error' },
        { event: createSegmentEvent({ name: 'Random Event' }), expectedBucket: 'default' },
      ];

      testCases.forEach(({ event, expectedBucket }) => {
        const bucketId = categorizeEvent(event);
        const config = getBucketConfig(bucketId);
        const color = getBucketColor(bucketId);

        expect(bucketId).toBe(expectedBucket);
        expect(config).toBeDefined();
        expect(config?.id).toBe(expectedBucket);
        expect(color).toBeTruthy(); // All default buckets have colors
      });
    });
  });
});
