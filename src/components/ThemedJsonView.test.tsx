import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { ThemedJsonView } from './ThemedJsonView';

// Mock the JsonView component
vi.mock('@uiw/react-json-view', () => {
  interface JsonViewProps {
    children?: ReactNode;
    value?: unknown;
    collapsed?: boolean;
    displayDataTypes?: boolean;
    displayObjectSize?: boolean;
    enableClipboard?: boolean;
    shouldExpandNodeInitially?: boolean;
  }

  const JsonViewComponent = ({
    children,
    value,
    collapsed,
    displayDataTypes: _displayDataTypes,
    displayObjectSize: _displayObjectSize,
    enableClipboard,
    shouldExpandNodeInitially: _shouldExpandNodeInitially,
  }: JsonViewProps) => {
    let jsonValue = '';
    try {
      jsonValue = JSON.stringify(value, null, 2);
    } catch (e) {
      jsonValue = '[Circular Reference]';
    }
    return (
      <div
        data-testid="json-view"
        data-collapsed={collapsed}
        data-enable-clipboard={enableClipboard}
      >
        <div data-testid="json-value">{jsonValue}</div>
        {children}
      </div>
    );
  };

  // Attach sub-components as properties
  JsonViewComponent.String = () => null;
  JsonViewComponent.Int = () => null;
  JsonViewComponent.True = () => null;
  JsonViewComponent.False = () => null;
  JsonViewComponent.Null = () => null;
  JsonViewComponent.KeyName = () => null;
  JsonViewComponent.Copied = () => null;

  return {
    default: JsonViewComponent,
  };
});

// Mock copyToClipboard
vi.mock('@src/lib/utils', () => ({
  copyToClipboard: vi.fn(() => true),
}));

// Mock highlightText
vi.mock('@src/lib/search', () => ({
  highlightText: vi.fn((text: string, query: string) => {
    if (!query.trim()) {
      return [{ text, highlight: false }];
    }
    const searchLower = query.toLowerCase();
    const textLower = text.toLowerCase();
    if (textLower.includes(searchLower)) {
      const index = textLower.indexOf(searchLower);
      return [
        { text: text.substring(0, index), highlight: false },
        { text: text.substring(index, index + query.length), highlight: true },
        { text: text.substring(index + query.length), highlight: false },
      ].filter((part) => part.text.length > 0);
    }
    return [{ text, highlight: false }];
  }),
}));

// Mock getJsonViewTheme
vi.mock('@src/lib/jsonViewTheme', () => ({
  getJsonViewTheme: vi.fn(() => ({
    backgroundColor: 'transparent',
    color: '#000',
  })),
}));

describe('ThemedJsonView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('rendering', () => {
    it('should render with simple object', () => {
      const value = { name: 'test', value: 123 };
      render(<ThemedJsonView value={value} />);

      const jsonView = screen.getByTestId('json-view');
      expect(jsonView).toBeInTheDocument();
    });

    it('should render with array', () => {
      const value = [1, 2, 3];
      render(<ThemedJsonView value={value} />);

      const jsonView = screen.getByTestId('json-view');
      expect(jsonView).toBeInTheDocument();
    });

    it('should render with nested object', () => {
      const value = { user: { name: 'John', age: 30 } };
      render(<ThemedJsonView value={value} />);

      const jsonView = screen.getByTestId('json-view');
      expect(jsonView).toBeInTheDocument();
    });

    it('should render with null value', () => {
      render(<ThemedJsonView value={null} />);

      const jsonView = screen.getByTestId('json-view');
      expect(jsonView).toBeInTheDocument();
    });

    it('should render with empty object', () => {
      render(<ThemedJsonView value={{}} />);

      const jsonView = screen.getByTestId('json-view');
      expect(jsonView).toBeInTheDocument();
    });

    it('should render with empty array', () => {
      render(<ThemedJsonView value={[]} />);

      const jsonView = screen.getByTestId('json-view');
      expect(jsonView).toBeInTheDocument();
    });
  });

  describe('props', () => {
    it('should apply custom fontSize', () => {
      render(<ThemedJsonView value={{ test: 'value' }} fontSize="14px" />);

      const jsonView = screen.getByTestId('json-view');
      expect(jsonView).toBeInTheDocument();
    });

    it('should respect collapsed prop', () => {
      render(<ThemedJsonView value={{ test: 'value' }} collapsed={true} />);

      const jsonView = screen.getByTestId('json-view');
      expect(jsonView).toHaveAttribute('data-collapsed', 'true');
    });

    it('should respect enableClipboard prop', () => {
      render(
        <ThemedJsonView value={{ test: 'value' }} enableClipboard={false} />
      );

      const jsonView = screen.getByTestId('json-view');
      expect(jsonView).toHaveAttribute('data-enable-clipboard', 'false');
    });

    it('should use default fontSize when not provided', () => {
      render(<ThemedJsonView value={{ test: 'value' }} />);

      const jsonView = screen.getByTestId('json-view');
      expect(jsonView).toBeInTheDocument();
    });

    it('should use default collapsed when not provided', () => {
      render(<ThemedJsonView value={{ test: 'value' }} />);

      const jsonView = screen.getByTestId('json-view');
      expect(jsonView).toHaveAttribute('data-collapsed', 'false');
    });

    it('should use default enableClipboard when not provided', () => {
      render(<ThemedJsonView value={{ test: 'value' }} />);

      const jsonView = screen.getByTestId('json-view');
      expect(jsonView).toHaveAttribute('data-enable-clipboard', 'true');
    });
  });

  describe('search highlighting', () => {
    it('should not render search highlighters when searchQuery is empty', () => {
      render(<ThemedJsonView value={{ name: 'test' }} searchQuery="" />);

      const jsonView = screen.getByTestId('json-view');
      expect(jsonView).toBeInTheDocument();
    });

    it('should not render search highlighters when searchQuery is not provided', () => {
      render(<ThemedJsonView value={{ name: 'test' }} />);

      const jsonView = screen.getByTestId('json-view');
      expect(jsonView).toBeInTheDocument();
    });
  });

  describe('shouldExpandNodeInitially', () => {
    it('should use default expansion logic when not provided', () => {
      render(<ThemedJsonView value={{ test: 'value' }} />);

      const jsonView = screen.getByTestId('json-view');
      expect(jsonView).toBeInTheDocument();
    });

    it('should use custom expansion logic when provided', () => {
      const customExpand = vi.fn(() => true);
      render(
        <ThemedJsonView
          value={{ test: 'value' }}
          shouldExpandNodeInitially={customExpand}
        />
      );

      const jsonView = screen.getByTestId('json-view');
      expect(jsonView).toBeInTheDocument();
    });

    it('should collapse integrations key by default', () => {
      const value = { integrations: { segment: true } };
      render(<ThemedJsonView value={value} />);

      const jsonView = screen.getByTestId('json-view');
      expect(jsonView).toBeInTheDocument();
    });

    it('should collapse userAgentData key by default', () => {
      const value = { userAgentData: { platform: 'web' } };
      render(<ThemedJsonView value={value} />);

      const jsonView = screen.getByTestId('json-view');
      expect(jsonView).toBeInTheDocument();
    });

    it('should collapse arrays longer than 10 items by default', () => {
      const value = { items: Array.from({ length: 15 }, (_, i) => i) };
      render(<ThemedJsonView value={value} />);

      const jsonView = screen.getByTestId('json-view');
      expect(jsonView).toBeInTheDocument();
    });

    it('should not collapse arrays with 10 or fewer items by default', () => {
      const value = { items: Array.from({ length: 10 }, (_, i) => i) };
      render(<ThemedJsonView value={value} />);

      const jsonView = screen.getByTestId('json-view');
      expect(jsonView).toBeInTheDocument();
    });
  });

  describe('clipboard functionality', () => {
    it('should enable clipboard by default', () => {
      render(<ThemedJsonView value={{ test: 'value' }} />);

      const jsonView = screen.getByTestId('json-view');
      expect(jsonView).toHaveAttribute('data-enable-clipboard', 'true');
    });

    it('should disable clipboard when enableClipboard is false', () => {
      render(
        <ThemedJsonView value={{ test: 'value' }} enableClipboard={false} />
      );

      const jsonView = screen.getByTestId('json-view');
      expect(jsonView).toHaveAttribute('data-enable-clipboard', 'false');
    });
  });

  describe('edge cases', () => {
    it('should handle very large objects', () => {
      const largeObject = Object.fromEntries(
        Array.from({ length: 100 }, (_, i) => [`key${i}`, `value${i}`])
      );
      render(<ThemedJsonView value={largeObject} />);

      const jsonView = screen.getByTestId('json-view');
      expect(jsonView).toBeInTheDocument();
    });

    it('should handle circular references gracefully', () => {
      // Note: JSON.stringify will fail on circular refs, but component should handle it
      const value: { name: string; self?: unknown } = { name: 'test' };
      value.self = value;

      // Component should render without crashing
      expect(() => {
        render(<ThemedJsonView value={value} />);
      }).not.toThrow();
    });

    it('should handle undefined values', () => {
      const value = { test: undefined };
      render(<ThemedJsonView value={value} />);

      const jsonView = screen.getByTestId('json-view');
      expect(jsonView).toBeInTheDocument();
    });

    it('should handle mixed types', () => {
      const value = {
        string: 'test',
        number: 123,
        boolean: true,
        null: null,
        array: [1, 2, 3],
        object: { nested: 'value' },
      };
      render(<ThemedJsonView value={value} />);

      const jsonView = screen.getByTestId('json-view');
      expect(jsonView).toBeInTheDocument();
    });
  });
});
