import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EventRow } from './EventRow';
import { createSegmentEvent } from '@src/test';
import type { SearchMatch } from '@src/lib/search';

// Mock EventRowHeader
vi.mock('./EventRowHeader', () => ({
  EventRowHeader: ({ event, isExpanded, isHidden, searchMatch, viewMode, onToggleHide, onViewModeChange }: any) => (
    <div data-testid="event-row-header">
      <span data-testid="event-name">{event.name}</span>
      <span data-testid="event-expanded">{String(isExpanded)}</span>
      <span data-testid="event-hidden">{String(isHidden)}</span>
      <span data-testid="search-query">{searchMatch?.query || ''}</span>
      <span data-testid="view-mode">{viewMode}</span>
      {onToggleHide && (
        <button
          data-testid="toggle-hide-button"
          onClick={() => onToggleHide(event.name)}
        >
          Toggle Hide
        </button>
      )}
      {onViewModeChange && (
        <button
          data-testid="view-mode-button"
          onClick={() => onViewModeChange(viewMode === 'json' ? 'structured' : 'json')}
        >
          Toggle View Mode
        </button>
      )}
    </div>
  ),
}));

// Mock EventDetailView
vi.mock('./detail/EventDetailView', () => ({
  EventDetailView: ({ event, viewMode, searchQuery }: any) => (
    <div data-testid="event-detail-view">
      <span data-testid="detail-event-name">{event.name}</span>
      <span data-testid="detail-view-mode">{viewMode}</span>
      <span data-testid="detail-search-query">{searchQuery}</span>
    </div>
  ),
}));

// Mock ErrorBoundary
vi.mock('@src/components', () => ({
  ErrorBoundary: ({ children, fallback, resetKeys }: any) => (
    <div data-testid="error-boundary" data-reset-keys={JSON.stringify(resetKeys)}>
      {children}
    </div>
  ),
  EventDetailErrorState: () => <div data-testid="event-detail-error">Error State</div>,
}));

describe('EventRow', () => {
  const mockOnToggleExpand = vi.fn();
  const mockOnToggleHide = vi.fn();
  const mockOnViewModeChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render event row with header', () => {
      const event = createSegmentEvent({ name: 'Test Event' });
      
      render(
        <EventRow
          event={event}
          isSelected={false}
          isExpanded={false}
          viewMode="json"
          onToggleExpand={mockOnToggleExpand}
          onViewModeChange={mockOnViewModeChange}
        />
      );

      expect(screen.getByTestId('event-row-header')).toBeInTheDocument();
      expect(screen.getByTestId('event-name')).toHaveTextContent('Test Event');
    });

    it('should render event name correctly', () => {
      const event = createSegmentEvent({ name: 'User Signed Up' });
      
      render(
        <EventRow
          event={event}
          isSelected={false}
          isExpanded={false}
          viewMode="json"
          onToggleExpand={mockOnToggleExpand}
          onViewModeChange={mockOnViewModeChange}
        />
      );

      expect(screen.getByTestId('event-name')).toHaveTextContent('User Signed Up');
    });

    it('should not render detail view when collapsed', () => {
      const event = createSegmentEvent();
      
      render(
        <EventRow
          event={event}
          isSelected={false}
          isExpanded={false}
          viewMode="json"
          onToggleExpand={mockOnToggleExpand}
          onViewModeChange={mockOnViewModeChange}
        />
      );

      expect(screen.queryByTestId('event-detail-view')).not.toBeInTheDocument();
    });

    it('should render detail view when expanded', () => {
      const event = createSegmentEvent({ name: 'Test Event' });
      
      render(
        <EventRow
          event={event}
          isSelected={false}
          isExpanded={true}
          viewMode="json"
          onToggleExpand={mockOnToggleExpand}
          onViewModeChange={mockOnViewModeChange}
        />
      );

      expect(screen.getByTestId('event-detail-view')).toBeInTheDocument();
      expect(screen.getByTestId('detail-event-name')).toHaveTextContent('Test Event');
    });
  });

  describe('selection state', () => {
    it('should apply selected styling when isSelected is true', () => {
      const event = createSegmentEvent();
      
      const { container } = render(
        <EventRow
          event={event}
          isSelected={true}
          isExpanded={false}
          viewMode="json"
          onToggleExpand={mockOnToggleExpand}
          onViewModeChange={mockOnViewModeChange}
        />
      );

      const row = container.firstChild as HTMLElement;
      expect(row).toHaveClass('bg-blue-500/10', 'border-l-2', 'border-l-blue-500');
    });

    it('should not apply selected styling when isSelected is false', () => {
      const event = createSegmentEvent();
      
      const { container } = render(
        <EventRow
          event={event}
          isSelected={false}
          isExpanded={false}
          viewMode="json"
          onToggleExpand={mockOnToggleExpand}
          onViewModeChange={mockOnViewModeChange}
        />
      );

      const row = container.firstChild as HTMLElement;
      expect(row).not.toHaveClass('bg-blue-500/10', 'border-l-2', 'border-l-blue-500');
    });
  });

  describe('expansion state', () => {
    it('should pass isExpanded to EventRowHeader', () => {
      const event = createSegmentEvent();
      
      render(
        <EventRow
          event={event}
          isSelected={false}
          isExpanded={true}
          viewMode="json"
          onToggleExpand={mockOnToggleExpand}
          onViewModeChange={mockOnViewModeChange}
        />
      );

      expect(screen.getByTestId('event-expanded')).toHaveTextContent('true');
    });

    it('should pass isExpanded=false to EventRowHeader when collapsed', () => {
      const event = createSegmentEvent();
      
      render(
        <EventRow
          event={event}
          isSelected={false}
          isExpanded={false}
          viewMode="json"
          onToggleExpand={mockOnToggleExpand}
          onViewModeChange={mockOnViewModeChange}
        />
      );

      expect(screen.getByTestId('event-expanded')).toHaveTextContent('false');
    });

    it('should toggle expansion when header is clicked', async () => {
      const user = userEvent.setup();
      const event = createSegmentEvent();
      
      render(
        <EventRow
          event={event}
          isSelected={false}
          isExpanded={false}
          viewMode="json"
          onToggleExpand={mockOnToggleExpand}
          onViewModeChange={mockOnViewModeChange}
        />
      );

      // Get the main toggle button (the one that wraps the header)
      const buttons = screen.getAllByRole('button');
      const toggleButton = buttons.find(btn => btn.querySelector('[data-testid="event-row-header"]'));
      expect(toggleButton).toBeInTheDocument();
      
      if (toggleButton) {
        await user.click(toggleButton);
        expect(mockOnToggleExpand).toHaveBeenCalledTimes(1);
        expect(mockOnToggleExpand).toHaveBeenCalledWith(event.id);
      }
    });
  });

  describe('hidden state', () => {
    it('should pass isHidden to EventRowHeader', () => {
      const event = createSegmentEvent();
      
      render(
        <EventRow
          event={event}
          isSelected={false}
          isExpanded={false}
          isHidden={true}
          viewMode="json"
          onToggleExpand={mockOnToggleExpand}
          onViewModeChange={mockOnViewModeChange}
          onToggleHide={mockOnToggleHide}
        />
      );

      expect(screen.getByTestId('event-hidden')).toHaveTextContent('true');
    });

    it('should pass isHidden=false when not hidden', () => {
      const event = createSegmentEvent();
      
      render(
        <EventRow
          event={event}
          isSelected={false}
          isExpanded={false}
          isHidden={false}
          viewMode="json"
          onToggleExpand={mockOnToggleExpand}
          onViewModeChange={mockOnViewModeChange}
          onToggleHide={mockOnToggleHide}
        />
      );

      expect(screen.getByTestId('event-hidden')).toHaveTextContent('false');
    });

    it('should call onToggleHide when hide button is clicked', async () => {
      const user = userEvent.setup();
      const event = createSegmentEvent({ name: 'Test Event' });
      
      render(
        <EventRow
          event={event}
          isSelected={false}
          isExpanded={true}
          viewMode="json"
          onToggleExpand={mockOnToggleExpand}
          onViewModeChange={mockOnViewModeChange}
          onToggleHide={mockOnToggleHide}
        />
      );

      const toggleHideButton = screen.getByTestId('toggle-hide-button');
      await user.click(toggleHideButton);

      expect(mockOnToggleHide).toHaveBeenCalledTimes(1);
      expect(mockOnToggleHide).toHaveBeenCalledWith('Test Event');
    });
  });

  describe('view mode', () => {
    it('should pass viewMode to EventRowHeader and EventDetailView', () => {
      const event = createSegmentEvent();
      
      render(
        <EventRow
          event={event}
          isSelected={false}
          isExpanded={true}
          viewMode="structured"
          onToggleExpand={mockOnToggleExpand}
          onViewModeChange={mockOnViewModeChange}
        />
      );

      expect(screen.getByTestId('view-mode')).toHaveTextContent('structured');
      expect(screen.getByTestId('detail-view-mode')).toHaveTextContent('structured');
    });

    it('should pass json viewMode correctly', () => {
      const event = createSegmentEvent();
      
      render(
        <EventRow
          event={event}
          isSelected={false}
          isExpanded={true}
          viewMode="json"
          onToggleExpand={mockOnToggleExpand}
          onViewModeChange={mockOnViewModeChange}
        />
      );

      expect(screen.getByTestId('view-mode')).toHaveTextContent('json');
      expect(screen.getByTestId('detail-view-mode')).toHaveTextContent('json');
    });

    it('should call onViewModeChange when view mode button is clicked', async () => {
      const user = userEvent.setup();
      const event = createSegmentEvent();
      
      render(
        <EventRow
          event={event}
          isSelected={false}
          isExpanded={true}
          viewMode="json"
          onToggleExpand={mockOnToggleExpand}
          onViewModeChange={mockOnViewModeChange}
        />
      );

      const viewModeButton = screen.getByTestId('view-mode-button');
      await user.click(viewModeButton);

      expect(mockOnViewModeChange).toHaveBeenCalledTimes(1);
      expect(mockOnViewModeChange).toHaveBeenCalledWith('structured');
    });
  });

  describe('search matching', () => {
    it('should pass searchMatch to EventRowHeader', () => {
      const event = createSegmentEvent();
      const searchMatch: SearchMatch = { query: 'test' };
      
      render(
        <EventRow
          event={event}
          isSelected={false}
          isExpanded={false}
          searchMatch={searchMatch}
          viewMode="json"
          onToggleExpand={mockOnToggleExpand}
          onViewModeChange={mockOnViewModeChange}
        />
      );

      expect(screen.getByTestId('search-query')).toHaveTextContent('test');
    });

    it('should pass searchQuery to EventDetailView when expanded', () => {
      const event = createSegmentEvent();
      const searchMatch: SearchMatch = { query: 'test query' };
      
      render(
        <EventRow
          event={event}
          isSelected={false}
          isExpanded={true}
          searchMatch={searchMatch}
          viewMode="json"
          onToggleExpand={mockOnToggleExpand}
          onViewModeChange={mockOnViewModeChange}
        />
      );

      expect(screen.getByTestId('detail-search-query')).toHaveTextContent('test query');
    });

    it('should pass empty searchQuery when searchMatch is null', () => {
      const event = createSegmentEvent();
      
      render(
        <EventRow
          event={event}
          isSelected={false}
          isExpanded={true}
          searchMatch={null}
          viewMode="json"
          onToggleExpand={mockOnToggleExpand}
          onViewModeChange={mockOnViewModeChange}
        />
      );

      expect(screen.getByTestId('detail-search-query')).toHaveTextContent('');
    });

    it('should pass empty searchQuery when searchMatch is undefined', () => {
      const event = createSegmentEvent();
      
      render(
        <EventRow
          event={event}
          isSelected={false}
          isExpanded={true}
          viewMode="json"
          onToggleExpand={mockOnToggleExpand}
          onViewModeChange={mockOnViewModeChange}
        />
      );

      expect(screen.getByTestId('detail-search-query')).toHaveTextContent('');
    });
  });

  describe('animation state', () => {
    it('should apply animation class when isAnimatingCollapse is true', () => {
      const event = createSegmentEvent();
      
      const { container } = render(
        <EventRow
          event={event}
          isSelected={false}
          isExpanded={false}
          isAnimatingCollapse={true}
          viewMode="json"
          onToggleExpand={mockOnToggleExpand}
          onViewModeChange={mockOnViewModeChange}
        />
      );

      const row = container.firstChild as HTMLElement;
      expect(row).toHaveClass('animate-ring-pulse');
    });

    it('should not apply animation class when isAnimatingCollapse is false', () => {
      const event = createSegmentEvent();
      
      const { container } = render(
        <EventRow
          event={event}
          isSelected={false}
          isExpanded={false}
          isAnimatingCollapse={false}
          viewMode="json"
          onToggleExpand={mockOnToggleExpand}
          onViewModeChange={mockOnViewModeChange}
        />
      );

      const row = container.firstChild as HTMLElement;
      expect(row).not.toHaveClass('animate-ring-pulse');
    });

    it('should default isAnimatingCollapse to false when not provided', () => {
      const event = createSegmentEvent();
      
      const { container } = render(
        <EventRow
          event={event}
          isSelected={false}
          isExpanded={false}
          viewMode="json"
          onToggleExpand={mockOnToggleExpand}
          onViewModeChange={mockOnViewModeChange}
        />
      );

      const row = container.firstChild as HTMLElement;
      expect(row).not.toHaveClass('animate-ring-pulse');
    });
  });

  describe('error boundary', () => {
    it('should wrap EventDetailView in ErrorBoundary', () => {
      const event = createSegmentEvent();
      
      render(
        <EventRow
          event={event}
          isSelected={false}
          isExpanded={true}
          viewMode="json"
          onToggleExpand={mockOnToggleExpand}
          onViewModeChange={mockOnViewModeChange}
        />
      );

      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      expect(screen.getByTestId('event-detail-view')).toBeInTheDocument();
    });

    it('should pass resetKeys to ErrorBoundary', () => {
      const event = createSegmentEvent({ id: 'event-123' });
      
      render(
        <EventRow
          event={event}
          isSelected={false}
          isExpanded={true}
          viewMode="json"
          onToggleExpand={mockOnToggleExpand}
          onViewModeChange={mockOnViewModeChange}
        />
      );

      const errorBoundary = screen.getByTestId('error-boundary');
      const resetKeys = JSON.parse(errorBoundary.getAttribute('data-reset-keys') || '[]');
      expect(resetKeys).toContain('event-123');
      expect(resetKeys).toContain('json');
    });

    it('should update resetKeys when event id changes', () => {
      const event1 = createSegmentEvent({ id: 'event-1' });
      const { rerender } = render(
        <EventRow
          event={event1}
          isSelected={false}
          isExpanded={true}
          viewMode="json"
          onToggleExpand={mockOnToggleExpand}
          onViewModeChange={mockOnViewModeChange}
        />
      );

      const event2 = createSegmentEvent({ id: 'event-2' });
      rerender(
        <EventRow
          event={event2}
          isSelected={false}
          isExpanded={true}
          viewMode="json"
          onToggleExpand={mockOnToggleExpand}
          onViewModeChange={mockOnViewModeChange}
        />
      );

      const errorBoundary = screen.getByTestId('error-boundary');
      const resetKeys = JSON.parse(errorBoundary.getAttribute('data-reset-keys') || '[]');
      expect(resetKeys).toContain('event-2');
    });

    it('should update resetKeys when viewMode changes', () => {
      const event = createSegmentEvent();
      const { rerender } = render(
        <EventRow
          event={event}
          isSelected={false}
          isExpanded={true}
          viewMode="json"
          onToggleExpand={mockOnToggleExpand}
          onViewModeChange={mockOnViewModeChange}
        />
      );

      rerender(
        <EventRow
          event={event}
          isSelected={false}
          isExpanded={true}
          viewMode="structured"
          onToggleExpand={mockOnToggleExpand}
          onViewModeChange={mockOnViewModeChange}
        />
      );

      const errorBoundary = screen.getByTestId('error-boundary');
      const resetKeys = JSON.parse(errorBoundary.getAttribute('data-reset-keys') || '[]');
      expect(resetKeys).toContain('structured');
    });
  });

  describe('edge cases', () => {
    it('should handle event without onToggleHide callback', () => {
      const event = createSegmentEvent();
      
      render(
        <EventRow
          event={event}
          isSelected={false}
          isExpanded={true}
          viewMode="json"
          onToggleExpand={mockOnToggleExpand}
          onViewModeChange={mockOnViewModeChange}
        />
      );

      expect(screen.queryByTestId('toggle-hide-button')).not.toBeInTheDocument();
    });

    it('should handle event with minimal properties', () => {
      const event = createSegmentEvent({
        name: 'Minimal Event',
        properties: {},
      });
      
      render(
        <EventRow
          event={event}
          isSelected={false}
          isExpanded={true}
          viewMode="json"
          onToggleExpand={mockOnToggleExpand}
          onViewModeChange={mockOnViewModeChange}
        />
      );

      expect(screen.getByTestId('event-name')).toHaveTextContent('Minimal Event');
      expect(screen.getByTestId('event-detail-view')).toBeInTheDocument();
    });

    it('should handle event with complex nested properties', () => {
      const event = createSegmentEvent({
        name: 'Complex Event',
        properties: {
          user: {
            profile: {
              name: 'John Doe',
              metadata: {
                tags: ['premium', 'active'],
              },
            },
          },
        },
      });
      
      render(
        <EventRow
          event={event}
          isSelected={false}
          isExpanded={true}
          viewMode="json"
          onToggleExpand={mockOnToggleExpand}
          onViewModeChange={mockOnViewModeChange}
        />
      );

      expect(screen.getByTestId('event-name')).toHaveTextContent('Complex Event');
      expect(screen.getByTestId('event-detail-view')).toBeInTheDocument();
    });
  });
});
