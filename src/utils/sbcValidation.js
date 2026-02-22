/**
 * SBC (Squad Building Challenge) validation engine.
 * Requirements: Total Rating >= 82, Market Value <= £300m, Min 3 nationalities, Max 2 per club.
 */

const SBC_REQUIREMENTS = {
  minRating: 82,
  maxMarketValue: 300_000_000,
  minNationalities: 3,
  maxPlayersPerClub: 2,
};

/**
 * @param {Record<string, object | null>} formation - Slot -> player or null
 * @returns {{ valid: boolean, requirements: { rating: { met: boolean, value: number, required: number }, marketValue: { met: boolean, value: number, max: number }, nationalities: { met: boolean, count: number, required: number }, sameClub: { met: boolean, maxPerClub: number } }}
 */
export function validateSBC(formation) {
  const players = Object.values(formation).filter(Boolean);
  const n = players.length;

  const totalRating =
    n > 0
      ? players.reduce((sum, p) => sum + (parseFloat(p.sofascore_rating) || 0), 0) / n
      : 0;
  const ratingMet = totalRating >= SBC_REQUIREMENTS.minRating;

  const totalMarketValue = players.reduce(
    (sum, p) => sum + (Number(p.market_value) || 0),
    0
  );
  const marketValueMet = totalMarketValue <= SBC_REQUIREMENTS.maxMarketValue;

  const nationalities = new Set(
    players.map((p) => (p.nationality && String(p.nationality).trim()) || 'Unknown').filter(Boolean)
  );
  const nationalityCount = nationalities.size;
  const nationalitiesMet = nationalityCount >= SBC_REQUIREMENTS.minNationalities;

  const clubCounts = {};
  for (const p of players) {
    const club = (p.team_name && String(p.team_name).trim()) || 'Unknown';
    clubCounts[club] = (clubCounts[club] || 0) + 1;
  }
  const maxFromOneClub = Math.max(0, ...Object.values(clubCounts));
  const sameClubMet = maxFromOneClub <= SBC_REQUIREMENTS.maxPlayersPerClub;

  const valid =
    n === 11 &&
    ratingMet &&
    marketValueMet &&
    nationalitiesMet &&
    sameClubMet;

  return {
    valid,
    requirements: {
      rating: {
        met: ratingMet,
        value: Math.round(totalRating * 10) / 10,
        required: SBC_REQUIREMENTS.minRating,
      },
      marketValue: {
        met: marketValueMet,
        value: totalMarketValue,
        max: SBC_REQUIREMENTS.maxMarketValue,
      },
      nationalities: {
        met: nationalitiesMet,
        count: nationalityCount,
        required: SBC_REQUIREMENTS.minNationalities,
      },
      sameClub: {
        met: sameClubMet,
        maxPerClub: SBC_REQUIREMENTS.maxPlayersPerClub,
        worst: maxFromOneClub,
      },
    },
  };
}

export { SBC_REQUIREMENTS };
