import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import StatsSummary from '../StatsSummary';

describe('Framer Motion Animations', () => {
  beforeEach(() => {
    // Reset any state
  });

  describe('Animation Classes', () => {
    it('should render component with animation support', () => {
      const { container } = render(<StatsSummary totalMatches={10} wins={5} />);
      
      // Verify component renders
      expect(container.firstChild).toBeInTheDocument();
      
      // Check for motion components (they'll have specific class patterns)
      const motionElements = container.querySelectorAll('[class*="transition"]');
      expect(motionElements.length).toBeGreaterThan(0);
    });

    it('should have transition classes for smooth animations', () => {
      const { container } = render(<StatsSummary totalMatches={10} wins={5} />);
      
      const summaryCard = container.querySelector('.bg-white\\/90');
      expect(summaryCard).toHaveClass('transition-all');
      expect(summaryCard).toHaveClass('duration-300');
    });

    it('should have hover animation classes', () => {
      const { container } = render(<StatsSummary totalMatches={10} wins={5} />);
      
      const summaryCard = container.querySelector('.bg-white\\/90');
      expect(summaryCard).toHaveClass('hover:scale-[1.02]');
    });
  });

  describe('Component Structure', () => {
    it('should render with proper structure for animations', () => {
      const { container } = render(<StatsSummary totalMatches={10} wins={5} />);
      
      // Component should have nested structure for animations
      const mainContainer = container.firstChild;
      expect(mainContainer).toBeInTheDocument();
    });
  });
});

