import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { HighlightedText } from './HighlightedText';

describe('HighlightedText', () => {
  describe('rendering', () => {
    it('should render text without highlighting when searchQuery is not provided', () => {
      render(<HighlightedText text="Hello World" />);

      const span = screen.getByText('Hello World');
      expect(span).toBeInTheDocument();
      expect(span.tagName).toBe('SPAN');
      expect(span.querySelector('mark')).not.toBeInTheDocument();
    });

    it('should render text without highlighting when searchQuery is empty', () => {
      render(<HighlightedText text="Hello World" searchQuery="" />);

      const span = screen.getByText('Hello World');
      expect(span).toBeInTheDocument();
      expect(span.querySelector('mark')).not.toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(<HighlightedText text="Hello World" className="font-bold" />);

      const span = screen.getByText('Hello World');
      expect(span).toHaveClass('font-bold');
    });
  });

  describe('highlighting', () => {
    it('should highlight single match at start', () => {
      const { container } = render(
        <HighlightedText text="Hello World" searchQuery="Hello" />
      );

      const mark = screen.getByText('Hello');
      expect(mark).toBeInTheDocument();
      expect(mark.tagName).toBe('MARK');
      expect(mark).toHaveClass('bg-yellow-500/30', 'dark:bg-yellow-500/40');

      // Check that the non-highlighted part exists as a span
      const spans = container.querySelectorAll('span');
      const nonHighlightedSpan = Array.from(spans).find(
        (span) => span.textContent === ' World'
      );
      expect(nonHighlightedSpan).toBeInTheDocument();
      expect(nonHighlightedSpan?.tagName).toBe('SPAN');
    });

    it('should highlight single match at end', () => {
      const { container } = render(
        <HighlightedText text="Hello World" searchQuery="World" />
      );

      const mark = screen.getByText('World');
      expect(mark).toBeInTheDocument();
      expect(mark.tagName).toBe('MARK');

      // Check that the non-highlighted part exists as a span
      const spans = container.querySelectorAll('span');
      const nonHighlightedSpan = Array.from(spans).find(
        (span) => span.textContent === 'Hello '
      );
      expect(nonHighlightedSpan).toBeInTheDocument();
      expect(nonHighlightedSpan?.tagName).toBe('SPAN');
    });

    it('should highlight single match in middle', () => {
      render(<HighlightedText text="Hello World" searchQuery="lo Wo" />);

      const mark = screen.getByText('lo Wo');
      expect(mark).toBeInTheDocument();
      expect(mark.tagName).toBe('MARK');
    });

    it('should highlight multiple matches', () => {
      render(<HighlightedText text="Hello Hello World" searchQuery="Hello" />);

      const marks = screen.getAllByText('Hello');
      expect(marks).toHaveLength(2);
      marks.forEach((mark) => {
        expect(mark.tagName).toBe('MARK');
      });
    });

    it('should be case-insensitive', () => {
      render(<HighlightedText text="Hello World" searchQuery="hello" />);

      const mark = screen.getByText('Hello');
      expect(mark).toBeInTheDocument();
      expect(mark.tagName).toBe('MARK');
    });

    it('should preserve original case in highlighted text', () => {
      render(<HighlightedText text="Hello World" searchQuery="hello" />);

      const mark = screen.getByText('Hello');
      expect(mark.textContent).toBe('Hello'); // Preserves original case
    });

    it('should not highlight when query does not match', () => {
      render(<HighlightedText text="Hello World" searchQuery="xyz" />);

      const span = screen.getByText('Hello World');
      expect(span).toBeInTheDocument();
      expect(span.querySelector('mark')).not.toBeInTheDocument();
    });

    it('should handle empty text', () => {
      const { container } = render(
        <HighlightedText text="" searchQuery="test" />
      );

      const rootSpan = container.querySelector('span');
      expect(rootSpan).toBeInTheDocument();
      expect(rootSpan?.textContent).toBe('');
      expect(rootSpan?.querySelector('mark')).not.toBeInTheDocument();
    });

    it('should handle special characters in query', () => {
      render(
        <HighlightedText text="user@example.com" searchQuery="@example" />
      );

      const mark = screen.getByText('@example');
      expect(mark).toBeInTheDocument();
      expect(mark.tagName).toBe('MARK');
    });

    it('should handle unicode characters', () => {
      render(<HighlightedText text="Hello 世界" searchQuery="世界" />);

      const mark = screen.getByText('世界');
      expect(mark).toBeInTheDocument();
      expect(mark.tagName).toBe('MARK');
    });

    it('should handle partial word matches', () => {
      const { container } = render(
        <HighlightedText text="testing" searchQuery="test" />
      );

      const mark = screen.getByText('test');
      expect(mark).toBeInTheDocument();
      expect(mark.tagName).toBe('MARK');

      // Check that the non-highlighted part exists as a span
      const spans = container.querySelectorAll('span');
      const nonHighlightedSpan = Array.from(spans).find(
        (span) => span.textContent === 'ing'
      );
      expect(nonHighlightedSpan).toBeInTheDocument();
      expect(nonHighlightedSpan?.tagName).toBe('SPAN');
    });

    it('should handle consecutive matches', () => {
      render(<HighlightedText text="testtest" searchQuery="test" />);

      const marks = screen.getAllByText('test');
      expect(marks).toHaveLength(2);
      marks.forEach((mark) => {
        expect(mark.tagName).toBe('MARK');
      });
    });

    it('should handle whitespace-only query', () => {
      render(<HighlightedText text="Hello World" searchQuery="   " />);

      const span = screen.getByText('Hello World');
      expect(span).toBeInTheDocument();
      expect(span.querySelector('mark')).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should render semantic HTML', () => {
      render(<HighlightedText text="Hello World" searchQuery="Hello" />);

      const mark = screen.getByText('Hello');
      expect(mark.tagName).toBe('MARK');
    });

    it('should maintain text structure', () => {
      render(<HighlightedText text="Hello World" searchQuery="Hello" />);

      const container = screen.getByText('Hello').closest('span');
      expect(container).toBeInTheDocument();
      expect(container?.textContent).toBe('Hello World');
    });
  });
});
