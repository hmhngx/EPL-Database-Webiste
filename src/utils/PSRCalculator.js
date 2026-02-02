/**
 * PSR (Profit and Sustainability Rules) Calculator
 * 
 * Implements Premier League's 3-year rolling loss limit calculation
 * EPL allows a maximum loss of £105 million over a 3-year period
 * 
 * Key Concepts:
 * - Amortization: Transfer fee spread over contract length
 * - Annual Wage Cost: Weekly wage × 52 weeks
 * - PSR Impact: Amortization + Annual Wages
 */

// Constants
export const PSR_LIMIT = 105000000; // £105 million (3-year rolling)
export const WEEKS_PER_YEAR = 52;
export const DEFAULT_CONTRACT_YEARS = 5;

/**
 * Calculate annual amortization for a transfer
 * Formula: Transfer Fee / Contract Years
 * 
 * @param {number} transferFee - Total transfer fee in £
 * @param {number} contractYears - Length of contract in years
 * @returns {number} Annual amortization cost
 */
export function calculateAmortization(transferFee, contractYears = DEFAULT_CONTRACT_YEARS) {
  if (transferFee < 0 || contractYears <= 0) {
    throw new Error('Invalid transfer fee or contract years');
  }
  return transferFee / contractYears;
}

/**
 * Calculate annual wage cost
 * Formula: Weekly Wage × 52 weeks
 * 
 * @param {number} weeklyWage - Weekly wage in £
 * @returns {number} Annual wage cost
 */
export function calculateAnnualWages(weeklyWage) {
  if (weeklyWage < 0) {
    throw new Error('Invalid weekly wage');
  }
  return weeklyWage * WEEKS_PER_YEAR;
}

/**
 * Calculate total annual impact of a new signing
 * 
 * @param {number} transferFee - Total transfer fee in £
 * @param {number} weeklyWage - Weekly wage in £
 * @param {number} contractYears - Length of contract in years
 * @returns {Object} Breakdown of annual costs
 */
export function calculateTransferImpact(transferFee, weeklyWage, contractYears = DEFAULT_CONTRACT_YEARS) {
  const amortization = calculateAmortization(transferFee, contractYears);
  const annualWages = calculateAnnualWages(weeklyWage);
  const totalAnnualCost = amortization + annualWages;

  return {
    amortization,
    annualWages,
    totalAnnualCost,
    totalContractValue: transferFee + (annualWages * contractYears)
  };
}

/**
 * Calculate PSR compliance metrics for a club
 * 
 * @param {Object} clubFinancials - Current club financial data
 * @param {number} clubFinancials.currentRevenue - Annual revenue in £
 * @param {number} clubFinancials.currentWageBill - Current annual wage bill in £
 * @param {number} clubFinancials.currentLosses - Current 3-year rolling losses in £
 * @param {number} clubFinancials.otherCosts - Other annual costs in £
 * @param {Object} proposedTransfer - Proposed transfer details
 * @param {number} proposedTransfer.transferFee - Transfer fee in £
 * @param {number} proposedTransfer.weeklyWage - Weekly wage in £
 * @param {number} proposedTransfer.contractYears - Contract length in years
 * @returns {Object} PSR compliance analysis
 */
export function calculatePSRCompliance(clubFinancials, proposedTransfer) {
  const {
    currentRevenue = 0,
    currentWageBill = 0,
    currentLosses = 0,
    otherCosts = 0
  } = clubFinancials;

  const {
    transferFee = 0,
    weeklyWage = 0,
    contractYears = DEFAULT_CONTRACT_YEARS
  } = proposedTransfer;

  // Calculate transfer impact
  const transferImpact = calculateTransferImpact(transferFee, weeklyWage, contractYears);

  // Calculate new annual costs
  const newWageBill = currentWageBill + transferImpact.annualWages;
  const newAnnualCosts = newWageBill + otherCosts + transferImpact.amortization;

  // Calculate annual profit/loss (simplified)
  const annualLoss = Math.max(0, newAnnualCosts - currentRevenue);

  // Project new 3-year losses (simplified: assumes similar annual losses)
  const projectedThreeYearLoss = currentLosses + annualLoss;

  // Calculate PSR metrics
  const psrUtilization = (projectedThreeYearLoss / PSR_LIMIT) * 100;
  const remainingPSRMargin = Math.max(0, PSR_LIMIT - projectedThreeYearLoss);
  const isCompliant = projectedThreeYearLoss <= PSR_LIMIT;

  // Calculate how much of PSR limit this transfer consumes
  const transferPSRImpact = transferImpact.totalAnnualCost;
  const psrImpactPercentage = (transferPSRImpact / PSR_LIMIT) * 100;

  return {
    // Current state
    currentLosses,
    currentWageBill,
    
    // Transfer impact
    transferImpact,
    
    // Projected state
    projectedThreeYearLoss,
    newWageBill,
    annualLoss,
    
    // PSR compliance
    psrLimit: PSR_LIMIT,
    psrUtilization: Math.min(100, psrUtilization), // Cap at 100%
    remainingPSRMargin,
    isCompliant,
    
    // Transfer specific metrics
    transferPSRImpact,
    psrImpactPercentage: Math.min(100, psrImpactPercentage),
    
    // Risk level
    riskLevel: getRiskLevel(psrUtilization),
    
    // Status message
    statusMessage: getStatusMessage(psrUtilization, isCompliant)
  };
}

/**
 * Determine risk level based on PSR utilization
 * 
 * @param {number} psrUtilization - PSR utilization percentage
 * @returns {string} Risk level (LOW, MEDIUM, HIGH, CRITICAL)
 */
export function getRiskLevel(psrUtilization) {
  if (psrUtilization < 50) return 'LOW';
  if (psrUtilization < 75) return 'MEDIUM';
  if (psrUtilization < 95) return 'HIGH';
  return 'CRITICAL';
}

/**
 * Generate status message based on PSR compliance
 * 
 * @param {number} psrUtilization - PSR utilization percentage
 * @param {boolean} isCompliant - Whether club is PSR compliant
 * @returns {string} Status message
 */
export function getStatusMessage(psrUtilization, isCompliant) {
  if (!isCompliant) {
    return 'PSR Breach - Transfer would exceed allowable losses';
  }
  
  if (psrUtilization < 50) {
    return 'Healthy PSR position - Significant room for investment';
  }
  
  if (psrUtilization < 75) {
    return 'Moderate PSR usage - Careful planning recommended';
  }
  
  if (psrUtilization < 95) {
    return 'High PSR utilization - Limited transfer flexibility';
  }
  
  return 'Critical PSR level - Minimal margin for error';
}

/**
 * Format currency for display
 * 
 * @param {number} amount - Amount in £
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount) {
  if (amount >= 1000000) {
    return `£${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `£${(amount / 1000).toFixed(0)}K`;
  }
  return `£${amount.toFixed(0)}`;
}

/**
 * Mock club financial data for demonstration
 * In production, this would come from your database
 */
export const MOCK_CLUB_FINANCIALS = {
  // Top 6 clubs
  'Manchester City': {
    currentRevenue: 712800000,
    currentWageBill: 423000000,
    currentLosses: 45000000,
    otherCosts: 180000000
  },
  'Arsenal': {
    currentRevenue: 465000000,
    currentWageBill: 235000000,
    currentLosses: 32000000,
    otherCosts: 150000000
  },
  'Liverpool': {
    currentRevenue: 594000000,
    currentWageBill: 314000000,
    currentLosses: 28000000,
    otherCosts: 165000000
  },
  'Chelsea': {
    currentRevenue: 513000000,
    currentWageBill: 341000000,
    currentLosses: 89000000, // Higher due to recent spending
    otherCosts: 175000000
  },
  'Manchester United': {
    currentRevenue: 648600000,
    currentWageBill: 331000000,
    currentLosses: 41000000,
    otherCosts: 190000000
  },
  'Tottenham': {
    currentRevenue: 523000000,
    currentWageBill: 181000000,
    currentLosses: 24000000,
    otherCosts: 155000000
  },
  
  // Mid-table clubs
  'Newcastle United': {
    currentRevenue: 250000000,
    currentWageBill: 145000000,
    currentLosses: 73000000,
    otherCosts: 85000000
  },
  'Aston Villa': {
    currentRevenue: 218000000,
    currentWageBill: 132000000,
    currentLosses: 62000000,
    otherCosts: 78000000
  },
  'Brighton': {
    currentRevenue: 204000000,
    currentWageBill: 97000000,
    currentLosses: 38000000,
    otherCosts: 68000000
  },
  'West Ham': {
    currentRevenue: 240000000,
    currentWageBill: 158000000,
    currentLosses: 56000000,
    otherCosts: 82000000
  },
  'Fulham': {
    currentRevenue: 185000000,
    currentWageBill: 112000000,
    currentLosses: 44000000,
    otherCosts: 65000000
  },
  'Brentford': {
    currentRevenue: 156000000,
    currentWageBill: 89000000,
    currentLosses: 52000000,
    otherCosts: 58000000
  },
  'Crystal Palace': {
    currentRevenue: 179000000,
    currentWageBill: 125000000,
    currentLosses: 61000000,
    otherCosts: 63000000
  },
  'Wolves': {
    currentRevenue: 193000000,
    currentWageBill: 118000000,
    currentLosses: 67000000,
    otherCosts: 71000000
  },
  'Everton': {
    currentRevenue: 172000000,
    currentWageBill: 141000000,
    currentLosses: 92000000, // PSR issues
    otherCosts: 75000000
  },
  'Nottingham Forest': {
    currentRevenue: 142000000,
    currentWageBill: 106000000,
    currentLosses: 78000000,
    otherCosts: 56000000
  },
  'Bournemouth': {
    currentRevenue: 148000000,
    currentWageBill: 88000000,
    currentLosses: 49000000,
    otherCosts: 54000000
  },
  'Ipswich Town': {
    currentRevenue: 85000000,
    currentWageBill: 52000000,
    currentLosses: 31000000,
    otherCosts: 38000000
  },
  'Leicester City': {
    currentRevenue: 215000000,
    currentWageBill: 134000000,
    currentLosses: 85000000,
    otherCosts: 72000000
  },
  'Southampton': {
    currentRevenue: 128000000,
    currentWageBill: 78000000,
    currentLosses: 47000000,
    otherCosts: 48000000
  }
};

export default {
  calculateAmortization,
  calculateAnnualWages,
  calculateTransferImpact,
  calculatePSRCompliance,
  getRiskLevel,
  getStatusMessage,
  formatCurrency,
  PSR_LIMIT,
  MOCK_CLUB_FINANCIALS
};
