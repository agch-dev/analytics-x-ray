import { describe, it, expect } from 'vitest';

import { createSegmentEvent } from '@src/test/utils';

import { parseSearchQuery, eventMatchesSearch, highlightText } from './search';

describe('search.ts', () => {
  describe('parseSearchQuery', () => {
    it('should return null for empty string', () => {
      expect(parseSearchQuery('')).toBeNull();
    });

    it('should return null for whitespace-only string', () => {
      expect(parseSearchQuery('   ')).toBeNull();
      expect(parseSearchQuery('\t\n\r')).toBeNull();
    });

    it('should return SearchMatch for valid query', () => {
      const result = parseSearchQuery('test query');
      expect(result).toEqual({
        query: 'test query',
      });
    });

    it('should trim whitespace from query', () => {
      const result = parseSearchQuery('  test query  ');
      expect(result).toEqual({
        query: 'test query',
      });
    });

    it('should handle single word query', () => {
      const result = parseSearchQuery('test');
      expect(result).toEqual({
        query: 'test',
      });
    });

    it('should handle query with special characters', () => {
      const result = parseSearchQuery('test@example.com');
      expect(result).toEqual({
        query: 'test@example.com',
      });
    });
  });

  describe('eventMatchesSearch', () => {
    it('should return true when match is null', () => {
      const event = createSegmentEvent();
      expect(eventMatchesSearch(event, null)).toBe(true);
    });

    it('should match event name (case-insensitive)', () => {
      const event = createSegmentEvent({ name: 'User Signed Up' });
      const match = parseSearchQuery('signed');

      expect(eventMatchesSearch(event, match)).toBe(true);
    });

    it('should match event name exactly', () => {
      const event = createSegmentEvent({ name: 'User Signed Up' });
      const match = parseSearchQuery('User Signed Up');

      expect(eventMatchesSearch(event, match)).toBe(true);
    });

    it('should match event name case-insensitively', () => {
      const event = createSegmentEvent({ name: 'User Signed Up' });
      const match = parseSearchQuery('USER SIGNED');

      expect(eventMatchesSearch(event, match)).toBe(true);
    });

    it('should match properties values', () => {
      const event = createSegmentEvent({
        properties: {
          email: 'user@example.com',
          userId: '12345',
        },
      });
      const match = parseSearchQuery('example.com');

      expect(eventMatchesSearch(event, match)).toBe(true);
    });

    it('should match property keys', () => {
      const event = createSegmentEvent({
        properties: {
          email: 'user@example.com',
          userId: '12345',
        },
      });
      const match = parseSearchQuery('email');

      expect(eventMatchesSearch(event, match)).toBe(true);
    });

    it('should match nested property values', () => {
      const event = createSegmentEvent({
        properties: {
          user: {
            name: 'John Doe',
            email: 'john@example.com',
          },
        },
      });
      const match = parseSearchQuery('John');

      expect(eventMatchesSearch(event, match)).toBe(true);
    });

    it('should match nested property keys', () => {
      const event = createSegmentEvent({
        properties: {
          user: {
            name: 'John Doe',
            email: 'john@example.com',
          },
        },
      });
      const match = parseSearchQuery('name');

      expect(eventMatchesSearch(event, match)).toBe(true);
    });

    it('should match deeply nested values', () => {
      const event = createSegmentEvent({
        properties: {
          metadata: {
            user: {
              profile: {
                firstName: 'John',
              },
            },
          },
        },
      });
      const match = parseSearchQuery('John');

      expect(eventMatchesSearch(event, match)).toBe(true);
    });

    it('should match array values', () => {
      const event = createSegmentEvent({
        properties: {
          tags: ['javascript', 'react', 'typescript'],
        },
      });
      const match = parseSearchQuery('react');

      expect(eventMatchesSearch(event, match)).toBe(true);
    });

    it('should match nested array values', () => {
      const event = createSegmentEvent({
        properties: {
          items: [
            { name: 'Product A', price: 100 },
            { name: 'Product B', price: 200 },
          ],
        },
      });
      const match = parseSearchQuery('Product B');

      expect(eventMatchesSearch(event, match)).toBe(true);
    });

    it('should match number values', () => {
      const event = createSegmentEvent({
        properties: {
          price: 99.99,
          quantity: 5,
        },
      });
      const match = parseSearchQuery('99');

      expect(eventMatchesSearch(event, match)).toBe(true);
    });

    it('should match boolean values', () => {
      const event = createSegmentEvent({
        properties: {
          isActive: true,
          isDeleted: false,
        },
      });
      const match = parseSearchQuery('true');

      expect(eventMatchesSearch(event, match)).toBe(true);
    });

    it('should match null values', () => {
      const event = createSegmentEvent({
        properties: {
          optionalField: null,
        },
      });
      const match = parseSearchQuery('null');

      expect(eventMatchesSearch(event, match)).toBe(true);
    });

    it('should match undefined values', () => {
      const event = createSegmentEvent({
        properties: {
          optionalField: undefined,
        },
      });
      const match = parseSearchQuery('undefined');

      expect(eventMatchesSearch(event, match)).toBe(true);
    });

    it('should match context values', () => {
      const event = createSegmentEvent({
        context: {
          library: {
            name: 'analytics.js',
            version: '1.0.0',
          },
          page: {
            path: '/home',
            referrer: 'https://example.com',
            search: '',
            title: 'Home Page',
            url: 'https://example.com/home',
          },
        },
      });
      const match = parseSearchQuery('analytics');

      expect(eventMatchesSearch(event, match)).toBe(true);
    });

    it('should match userId', () => {
      const event = createSegmentEvent({
        userId: 'user-12345',
      });
      const match = parseSearchQuery('user-12345');

      expect(eventMatchesSearch(event, match)).toBe(true);
    });

    it('should match anonymousId', () => {
      const event = createSegmentEvent({
        anonymousId: 'anon-67890',
      });
      const match = parseSearchQuery('anon-67890');

      expect(eventMatchesSearch(event, match)).toBe(true);
    });

    it('should match messageId', () => {
      const event = createSegmentEvent({
        messageId: 'msg-abc123',
      });
      const match = parseSearchQuery('msg-abc');

      expect(eventMatchesSearch(event, match)).toBe(true);
    });

    it('should match provider', () => {
      const event = createSegmentEvent({
        provider: 'rudderstack',
      });
      const match = parseSearchQuery('rudderstack');

      expect(eventMatchesSearch(event, match)).toBe(true);
    });

    it('should match URL', () => {
      const event = createSegmentEvent({
        url: 'https://example.com/products',
      });
      const match = parseSearchQuery('products');

      expect(eventMatchesSearch(event, match)).toBe(true);
    });

    it('should not match when query does not exist in event', () => {
      const event = createSegmentEvent({
        name: 'Test Event',
        properties: {
          value: 'test',
        },
      });
      const match = parseSearchQuery('nonexistent');

      expect(eventMatchesSearch(event, match)).toBe(false);
    });

    it('should handle partial matches in strings', () => {
      const event = createSegmentEvent({
        properties: {
          email: 'user@example.com',
        },
      });
      const match = parseSearchQuery('example');

      expect(eventMatchesSearch(event, match)).toBe(true);
    });

    it('should handle multiple matches in same event', () => {
      const event = createSegmentEvent({
        name: 'Purchase Completed',
        properties: {
          product: 'Example Product',
          category: 'Example Category',
        },
      });
      const match = parseSearchQuery('Example');

      expect(eventMatchesSearch(event, match)).toBe(true);
    });

    it('should be case-insensitive for all matches', () => {
      const event = createSegmentEvent({
        name: 'User Action',
        properties: {
          type: 'CLICK',
        },
      });
      const match = parseSearchQuery('user');

      expect(eventMatchesSearch(event, match)).toBe(true);
    });
  });

  describe('highlightText', () => {
    it('should return unhighlighted text when query is empty', () => {
      const result = highlightText('Hello World', '');
      expect(result).toEqual([{ text: 'Hello World', highlight: false }]);
    });

    it('should return unhighlighted text when query is whitespace only', () => {
      const result = highlightText('Hello World', '   ');
      expect(result).toEqual([{ text: 'Hello World', highlight: false }]);
    });

    it('should highlight single match at start', () => {
      const result = highlightText('Hello World', 'Hello');
      expect(result).toEqual([
        { text: 'Hello', highlight: true },
        { text: ' World', highlight: false },
      ]);
    });

    it('should highlight single match at end', () => {
      const result = highlightText('Hello World', 'World');
      expect(result).toEqual([
        { text: 'Hello ', highlight: false },
        { text: 'World', highlight: true },
      ]);
    });

    it('should highlight single match in middle', () => {
      const result = highlightText('Hello World', 'lo Wo');
      expect(result).toEqual([
        { text: 'Hel', highlight: false },
        { text: 'lo Wo', highlight: true },
        { text: 'rld', highlight: false },
      ]);
    });

    it('should highlight multiple matches', () => {
      const result = highlightText('Hello Hello World', 'Hello');
      expect(result).toEqual([
        { text: 'Hello', highlight: true },
        { text: ' ', highlight: false },
        { text: 'Hello', highlight: true },
        { text: ' World', highlight: false },
      ]);
    });

    it('should be case-insensitive', () => {
      const result = highlightText('Hello World', 'hello');
      expect(result).toEqual([
        { text: 'Hello', highlight: true },
        { text: ' World', highlight: false },
      ]);
    });

    it('should preserve original case in highlighted text', () => {
      const result = highlightText('Hello World', 'hello');
      expect(result[0].text).toBe('Hello'); // Preserves original case
      expect(result[0].highlight).toBe(true);
    });

    it('should handle overlapping matches correctly', () => {
      const result = highlightText('aaa', 'aa');
      // Should find matches at positions 0 and 1
      expect(result).toEqual([
        { text: 'aa', highlight: true },
        { text: 'a', highlight: false },
      ]);
    });

    it('should handle query longer than text', () => {
      const result = highlightText('Hello', 'Hello World');
      expect(result).toEqual([{ text: 'Hello', highlight: false }]);
    });

    it('should handle special characters in query', () => {
      const result = highlightText('user@example.com', '@example');
      expect(result).toEqual([
        { text: 'user', highlight: false },
        { text: '@example', highlight: true },
        { text: '.com', highlight: false },
      ]);
    });

    it('should handle unicode characters', () => {
      const result = highlightText('Hello 世界', '世界');
      expect(result).toEqual([
        { text: 'Hello ', highlight: false },
        { text: '世界', highlight: true },
      ]);
    });

    it('should handle empty text', () => {
      const result = highlightText('', 'test');
      expect(result).toEqual([{ text: '', highlight: false }]);
    });

    it('should handle text with only whitespace', () => {
      const result = highlightText('   ', 'test');
      expect(result).toEqual([{ text: '   ', highlight: false }]);
    });

    it('should handle consecutive matches', () => {
      const result = highlightText('testtest', 'test');
      expect(result).toEqual([
        { text: 'test', highlight: true },
        { text: 'test', highlight: true },
      ]);
    });

    it('should handle matches at word boundaries', () => {
      const result = highlightText('test testing', 'test');
      expect(result).toEqual([
        { text: 'test', highlight: true },
        { text: ' ', highlight: false },
        { text: 'test', highlight: true },
        { text: 'ing', highlight: false },
      ]);
    });

    it('should handle partial word matches', () => {
      const result = highlightText('testing', 'test');
      expect(result).toEqual([
        { text: 'test', highlight: true },
        { text: 'ing', highlight: false },
      ]);
    });

    it('should return unhighlighted text when no match found', () => {
      const result = highlightText('Hello World', 'xyz');
      expect(result).toEqual([{ text: 'Hello World', highlight: false }]);
    });
  });
});
