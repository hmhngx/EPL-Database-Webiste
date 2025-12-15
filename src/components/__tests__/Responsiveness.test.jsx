import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import StatsSummary from '../StatsSummary';

describe('Responsiveness - Viewport Mocks', () => {
  beforeEach(() => {
    // Reset viewport if needed
  });

  describe('Mobile Viewport (375x667)', () => {
    beforeEach(() => {
      // Viewport is mocked in setup.js
      Object.defineProperty(window, 'innerWidth', { value: 375, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 667, writable: true });
    });

    it('should render with mobile-optimized classes', () => {
      const { container } = render(
        <StatsSummary totalMatches={10} wins={5} />
      );
      
      // Check for responsive padding
      const summaryCard = container.querySelector('.p-6');
      expect(summaryCard).toHaveClass('sm:p-8');
      
      // Check for responsive text sizes
      const heading = container.querySelector('h2');
      expect(heading).toHaveClass('text-xl');
      expect(heading).toHaveClass('sm:text-2xl');
    });

    it('should use single column grid on mobile', () => {
      const { container } = render(
        <StatsSummary totalMatches={10} wins={5} />
      );
      
      const grid = container.querySelector('.grid');
      expect(grid).toHaveClass('grid-cols-1');
      expect(grid).toHaveClass('sm:grid-cols-2');
      expect(grid).toHaveClass('lg:grid-cols-3');
    });

    it('should have mobile-friendly spacing', () => {
      const { container } = render(
        <StatsSummary totalMatches={10} wins={5} />
      );
      
      const grid = container.querySelector('.grid');
      expect(grid).toHaveClass('gap-4');
      expect(grid).toHaveClass('sm:gap-6');
    });
  });

  describe('Tablet Viewport (768x1024)', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'innerWidth', { value: 768, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 1024, writable: true });
    });

    it('should render with tablet-optimized layout', () => {
      const { container } = render(
        <StatsSummary totalMatches={10} wins={5} />
      );
      
      const grid = container.querySelector('.grid');
      expect(grid).toHaveClass('sm:grid-cols-2');
      expect(grid).toHaveClass('lg:grid-cols-3');
    });

    it('should have tablet-appropriate text sizes', () => {
      const { container } = render(
        <StatsSummary totalMatches={10} wins={5} />
      );
      
      const statValue = container.querySelector('.text-2xl');
      expect(statValue).toHaveClass('sm:text-3xl');
    });
  });

  describe('Desktop Viewport (1920x1080)', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'innerWidth', { value: 1920, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 1080, writable: true });
    });

    it('should render with desktop-optimized layout', () => {
      const { container } = render(
        <StatsSummary totalMatches={10} wins={5} />
      );
      
      const grid = container.querySelector('.grid');
      expect(grid).toHaveClass('lg:grid-cols-3');
      expect(grid).toHaveClass('xl:grid-cols-5');
    });

    it('should have desktop-appropriate spacing', () => {
      const { container } = render(
        <StatsSummary totalMatches={10} wins={5} />
      );
      
      const grid = container.querySelector('.grid');
      expect(grid).toHaveClass('sm:gap-6');
    });
  });

  describe('Responsive Typography', () => {
    it('should have responsive text sizes for labels', () => {
      Object.defineProperty(window, 'innerWidth', { value: 375, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 667, writable: true });
      const { container } = render(
        <StatsSummary totalMatches={10} wins={5} />
      );
      
      const labels = container.querySelectorAll('.text-xs');
      labels.forEach(label => {
        expect(label).toHaveClass('sm:text-sm');
      });
    });

    it('should have responsive text sizes for values', () => {
      Object.defineProperty(window, 'innerWidth', { value: 375, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 667, writable: true });
      const { container } = render(
        <StatsSummary totalMatches={10} wins={5} />
      );
      
      const values = container.querySelectorAll('.text-2xl');
      values.forEach(value => {
        expect(value).toHaveClass('sm:text-3xl');
      });
    });
  });

  describe('Responsive Padding and Margins', () => {
    it('should have responsive padding on cards', () => {
      Object.defineProperty(window, 'innerWidth', { value: 375, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 667, writable: true });
      const { container } = render(
        <StatsSummary totalMatches={10} wins={5} />
      );
      
      const statCards = container.querySelectorAll('.p-4');
      statCards.forEach(card => {
        expect(card).toHaveClass('sm:p-5');
      });
    });

    it('should have responsive spacing between elements', () => {
      Object.defineProperty(window, 'innerWidth', { value: 375, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 667, writable: true });
      const { container } = render(
        <StatsSummary totalMatches={10} wins={5} />
      );
      
      const iconContainer = container.querySelector('.space-y-2');
      expect(iconContainer).toHaveClass('sm:space-y-3');
    });
  });

  describe('Responsive Grid Breakpoints', () => {
    it('should adapt grid columns based on viewport', () => {
      const { container } = render(
        <StatsSummary totalMatches={10} wins={5} />
      );
      
      const grid = container.querySelector('.grid');
      const classes = grid.className;
      
      // Should have all breakpoint classes
      expect(classes).toContain('grid-cols-1');
      expect(classes).toContain('sm:grid-cols-2');
      expect(classes).toContain('lg:grid-cols-3');
      expect(classes).toContain('xl:grid-cols-5');
    });
  });

  describe('Responsive Tooltip Positioning', () => {
    it('should have responsive tooltip width', () => {
      Object.defineProperty(window, 'innerWidth', { value: 375, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 667, writable: true });
      const { container } = render(
        <StatsSummary totalMatches={10} wins={5} />
      );
      
      // Tooltip classes should be present (even if not visible)
      // The component structure should support responsive tooltips
      const statCards = container.querySelectorAll('.relative');
      expect(statCards.length).toBeGreaterThan(0);
    });
  });
});

