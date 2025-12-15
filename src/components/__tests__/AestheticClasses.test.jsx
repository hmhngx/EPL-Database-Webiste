import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import StatsSummary from '../StatsSummary';

describe('Aesthetic Classes and Hover States', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('StatsSummary Component', () => {
    it('should render with correct base aesthetic classes', () => {
      const { container } = render(
        <StatsSummary totalMatches={10} wins={5} draws={2} losses={3} />
      );
      
      const summaryCard = container.querySelector('.bg-white\\/90');
      expect(summaryCard).toBeInTheDocument();
      expect(summaryCard).toHaveClass('dark:bg-neutral-800/90');
      expect(summaryCard).toHaveClass('backdrop-blur-sm');
      expect(summaryCard).toHaveClass('rounded-xl');
      expect(summaryCard).toHaveClass('shadow-lg');
    });

    it('should have hover transition classes', () => {
      const { container } = render(
        <StatsSummary totalMatches={10} wins={5} />
      );
      
      const summaryCard = container.querySelector('.bg-white\\/90');
      expect(summaryCard).toHaveClass('hover:shadow-xl');
      expect(summaryCard).toHaveClass('transition-all');
      expect(summaryCard).toHaveClass('duration-300');
      expect(summaryCard).toHaveClass('hover:scale-[1.02]');
    });

    it('should have glow effect classes on hover', () => {
      const { container } = render(
        <StatsSummary totalMatches={10} wins={5} />
      );
      
      const summaryCard = container.querySelector('.bg-white\\/90');
      expect(summaryCard).toHaveClass('hover:border-accent/30');
      expect(summaryCard).toHaveClass('hover:shadow-[0_0_20px_rgba(0,255,133,0.2)]');
    });

    it('should apply scale and glow on stat card hover', () => {
      const { container } = render(
        <StatsSummary totalMatches={10} wins={5} />
      );
      
      const statCards = container.querySelectorAll('.cursor-pointer');
      expect(statCards.length).toBeGreaterThan(0);
      
      const firstCard = statCards[0];
      expect(firstCard).toHaveClass('hover:scale-105');
      expect(firstCard).toHaveClass('hover:shadow-md');
      expect(firstCard).toHaveClass('hover:shadow-green-500/10');
    });

    it('should have cursor-pointer class on interactive elements', () => {
      const { container } = render(
        <StatsSummary totalMatches={10} wins={5} />
      );
      
      const interactiveElements = container.querySelectorAll('.cursor-pointer');
      expect(interactiveElements.length).toBeGreaterThan(0);
      
      interactiveElements.forEach(element => {
        expect(element).toHaveClass('cursor-pointer');
      });
    });
  });

  describe('Hover State Snapshots', () => {
    it('should match snapshot of base state', () => {
      const { container } = render(
        <StatsSummary totalMatches={10} wins={5} draws={2} losses={3} />
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it('should apply hover classes when mouse enters', () => {
      const { container } = render(
        <StatsSummary totalMatches={10} wins={5} />
      );
      
      const statCard = container.querySelector('.cursor-pointer');
      if (statCard) {
        fireEvent.mouseEnter(statCard);
        
        // Check that hover classes are present
        expect(statCard).toHaveClass('scale-105');
        expect(statCard).toHaveClass('shadow-lg');
        expect(statCard).toHaveClass('shadow-green-500/20');
      }
    });
  });

  describe('Dark Mode Classes', () => {
    it('should have dark mode variants for all elements', () => {
      const { container } = render(
        <StatsSummary totalMatches={10} wins={5} />
      );
      
      const summaryCard = container.querySelector('.bg-white\\/90');
      expect(summaryCard).toHaveClass('dark:bg-neutral-800/90');
      
      const statCards = container.querySelectorAll('.bg-gradient-to-br');
      statCards.forEach(card => {
        expect(card).toHaveClass('dark:from-neutral-700/80');
        expect(card).toHaveClass('dark:to-neutral-800/80');
      });
    });

    it('should have high contrast text in dark mode', () => {
      const { container } = render(
        <StatsSummary totalMatches={10} wins={5} />
      );
      
      const heading = container.querySelector('h2');
      expect(heading).toHaveClass('dark:text-white');
    });
  });
});

