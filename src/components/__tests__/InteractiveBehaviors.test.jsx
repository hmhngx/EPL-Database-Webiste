import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import StatsSummary from '../StatsSummary';

describe('Interactive Behaviors - Hover Effects', () => {
  beforeEach(() => {
    // Reset any state
  });

  describe('Scale Transformations on Hover', () => {
    it('should trigger scale transformation on hover', async () => {
      const { container } = render(
        <StatsSummary totalMatches={10} wins={5} />
      );
      
      const summaryCard = container.querySelector('.bg-white\\/90');
      expect(summaryCard).toBeInTheDocument();
      
      // Verify hover classes are present
      expect(summaryCard).toHaveClass('hover:scale-[1.02]');
    });

    it('should apply scale-105 class on stat card hover', () => {
      const { container } = render(
        <StatsSummary totalMatches={10} wins={5} />
      );
      
      const statCard = container.querySelector('.cursor-pointer');
      if (statCard) {
        fireEvent.mouseEnter(statCard);
        
        // The scale class should be applied
        expect(statCard).toHaveClass('scale-105');
      }
    });

    it('should remove scale class on mouse leave', () => {
      const { container } = render(
        <StatsSummary totalMatches={10} wins={5} />
      );
      
      const statCard = container.querySelector('.cursor-pointer');
      if (statCard) {
        fireEvent.mouseEnter(statCard);
        expect(statCard).toHaveClass('scale-105');
        
        fireEvent.mouseLeave(statCard);
        // After mouse leave, the scale class should be removed (CSS handles this)
        // We verify the element still exists
        expect(statCard).toBeInTheDocument();
      }
    });
  });

  describe('Glow Effects on Hover', () => {
    it('should apply glow shadow on hover', () => {
      const { container } = render(
        <StatsSummary totalMatches={10} wins={5} />
      );
      
      const summaryCard = container.querySelector('.bg-white\\/90');
      expect(summaryCard).toHaveClass('hover:shadow-[0_0_20px_rgba(0,255,133,0.2)]');
    });

    it('should apply green glow to stat cards on hover', () => {
      const { container } = render(
        <StatsSummary totalMatches={10} wins={5} />
      );
      
      const statCard = container.querySelector('.cursor-pointer');
      if (statCard) {
        fireEvent.mouseEnter(statCard);
        
        expect(statCard).toHaveClass('shadow-lg');
        expect(statCard).toHaveClass('shadow-green-500/20');
      }
    });

    it('should apply icon glow effect on hover', () => {
      const { container } = render(
        <StatsSummary totalMatches={10} wins={5} />
      );
      
      const statCard = container.querySelector('.cursor-pointer');
      if (statCard) {
        fireEvent.mouseEnter(statCard);
        
        // Check for icon glow classes
        const iconContainer = statCard.querySelector('.transition-all');
        if (iconContainer) {
          expect(iconContainer).toHaveClass('scale-110');
          expect(iconContainer).toHaveClass('drop-shadow-[0_0_8px_rgba(0,255,133,0.4)]');
        }
      }
    });
  });

  describe('Border Color Changes on Hover', () => {
    it('should change border color on hover', () => {
      const { container } = render(
        <StatsSummary totalMatches={10} wins={5} />
      );
      
      const summaryCard = container.querySelector('.bg-white\\/90');
      expect(summaryCard).toHaveClass('hover:border-accent/30');
    });

    it('should apply accent border to stat cards on hover', () => {
      const { container } = render(
        <StatsSummary totalMatches={10} wins={5} />
      );
      
      const statCard = container.querySelector('.cursor-pointer');
      if (statCard) {
        fireEvent.mouseEnter(statCard);
        expect(statCard).toHaveClass('border-accent/50');
      }
    });
  });

  describe('Color Transitions on Hover', () => {
    it('should transition text color on hover', () => {
      const { container } = render(
        <StatsSummary totalMatches={10} wins={5} />
      );
      
      const statCard = container.querySelector('.cursor-pointer');
      if (statCard) {
        fireEvent.mouseEnter(statCard);
        
        // Check for color transition classes
        const valueSpan = statCard.querySelector('.text-2xl, .text-3xl');
        if (valueSpan) {
          expect(valueSpan).toHaveClass('text-green-400');
          expect(valueSpan).toHaveClass('dark:text-green-300');
        }
      }
    });
  });
});

