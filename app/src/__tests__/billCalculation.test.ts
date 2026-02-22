/**
 * Unit tests for bill calculation logic
 * Tests the core calculation functions without Supabase dependencies
 */

interface ParticipantClaim {
  userId: string;
  itemsTotal: number;
}

interface DistributionOptions {
  tip: 'proportional' | 'equal';
  tax: 'proportional' | 'equal';
}

interface CalculationResult {
  userId: string;
  itemsTotal: number;
  taxPortion: number;
  tipPortion: number;
  totalOwed: number;
}

/**
 * Pure calculation function extracted for testing
 */
function calculateParticipantTotals(
  claims: ParticipantClaim[],
  subtotal: number,
  tax: number,
  tip: number,
  unclaimedTotal: number,
  distribution: DistributionOptions
): CalculationResult[] {
  const participantCount = claims.length || 1;
  const unclaimedPerPerson = participantCount > 0 ? unclaimedTotal / participantCount : 0;

  return claims.map((claim) => {
    const itemsProportion = subtotal > 0 ? claim.itemsTotal / subtotal : 0;

    // Tax distribution
    const taxPortion =
      distribution.tax === 'equal' ? tax / participantCount : tax * itemsProportion;

    // Tip distribution
    const tipPortion =
      distribution.tip === 'equal' ? tip / participantCount : tip * itemsProportion;

    // Include unclaimed items
    const itemsWithUnclaimed = claim.itemsTotal + unclaimedPerPerson;

    return {
      userId: claim.userId,
      itemsTotal: itemsWithUnclaimed,
      taxPortion,
      tipPortion,
      totalOwed: itemsWithUnclaimed + taxPortion + tipPortion,
    };
  });
}

describe('Bill Calculation', () => {
  describe('calculateParticipantTotals', () => {
    const baseClaims: ParticipantClaim[] = [
      { userId: 'user1', itemsTotal: 30 },
      { userId: 'user2', itemsTotal: 20 },
    ];

    it('should calculate proportional tax and tip correctly', () => {
      const results = calculateParticipantTotals(
        baseClaims,
        50, // subtotal
        10, // tax
        5, // tip
        0, // no unclaimed items
        { tip: 'proportional', tax: 'proportional' }
      );

      // User1: 30/50 = 60% of tax and tip
      expect(results[0].taxPortion).toBeCloseTo(6); // 60% of 10
      expect(results[0].tipPortion).toBeCloseTo(3); // 60% of 5
      expect(results[0].totalOwed).toBeCloseTo(39); // 30 + 6 + 3

      // User2: 20/50 = 40% of tax and tip
      expect(results[1].taxPortion).toBeCloseTo(4); // 40% of 10
      expect(results[1].tipPortion).toBeCloseTo(2); // 40% of 5
      expect(results[1].totalOwed).toBeCloseTo(26); // 20 + 4 + 2
    });

    it('should calculate equal tax and tip correctly', () => {
      const results = calculateParticipantTotals(
        baseClaims,
        50, // subtotal
        10, // tax
        6, // tip
        0, // no unclaimed items
        { tip: 'equal', tax: 'equal' }
      );

      // Both users get 50% of tax and tip
      expect(results[0].taxPortion).toBeCloseTo(5);
      expect(results[0].tipPortion).toBeCloseTo(3);
      expect(results[0].totalOwed).toBeCloseTo(38); // 30 + 5 + 3

      expect(results[1].taxPortion).toBeCloseTo(5);
      expect(results[1].tipPortion).toBeCloseTo(3);
      expect(results[1].totalOwed).toBeCloseTo(28); // 20 + 5 + 3
    });

    it('should handle mixed distribution (proportional tax, equal tip)', () => {
      const results = calculateParticipantTotals(
        baseClaims,
        50, // subtotal
        10, // tax
        10, // tip
        0, // no unclaimed items
        { tip: 'equal', tax: 'proportional' }
      );

      // User1: proportional tax, equal tip
      expect(results[0].taxPortion).toBeCloseTo(6); // 60% of 10
      expect(results[0].tipPortion).toBeCloseTo(5); // 50% of 10
      expect(results[0].totalOwed).toBeCloseTo(41); // 30 + 6 + 5
    });

    it('should split unclaimed items equally', () => {
      const results = calculateParticipantTotals(
        baseClaims,
        50, // subtotal
        0, // no tax
        0, // no tip
        10, // 10 in unclaimed items
        { tip: 'proportional', tax: 'proportional' }
      );

      // Each user gets 5 added from unclaimed
      expect(results[0].itemsTotal).toBeCloseTo(35); // 30 + 5
      expect(results[0].totalOwed).toBeCloseTo(35);

      expect(results[1].itemsTotal).toBeCloseTo(25); // 20 + 5
      expect(results[1].totalOwed).toBeCloseTo(25);
    });

    it('should handle single participant', () => {
      const singleClaim: ParticipantClaim[] = [{ userId: 'user1', itemsTotal: 50 }];

      const results = calculateParticipantTotals(
        singleClaim,
        50, // subtotal
        10, // tax
        5, // tip
        0, // no unclaimed items
        { tip: 'proportional', tax: 'proportional' }
      );

      expect(results[0].taxPortion).toBeCloseTo(10);
      expect(results[0].tipPortion).toBeCloseTo(5);
      expect(results[0].totalOwed).toBeCloseTo(65);
    });

    it('should handle zero subtotal gracefully', () => {
      const zeroClaims: ParticipantClaim[] = [
        { userId: 'user1', itemsTotal: 0 },
        { userId: 'user2', itemsTotal: 0 },
      ];

      const results = calculateParticipantTotals(
        zeroClaims,
        0, // subtotal
        10, // tax
        10, // tip
        0, // no unclaimed items
        { tip: 'proportional', tax: 'proportional' }
      );

      // With zero subtotal, proportional = 0
      expect(results[0].taxPortion).toBeCloseTo(0);
      expect(results[0].tipPortion).toBeCloseTo(0);
    });

    it('should handle three-way split correctly', () => {
      const threeClaims: ParticipantClaim[] = [
        { userId: 'user1', itemsTotal: 30 },
        { userId: 'user2', itemsTotal: 30 },
        { userId: 'user3', itemsTotal: 30 },
      ];

      const results = calculateParticipantTotals(
        threeClaims,
        90, // subtotal
        9, // tax
        9, // tip
        0, // no unclaimed items
        { tip: 'equal', tax: 'equal' }
      );

      // Each gets 1/3
      results.forEach((result) => {
        expect(result.taxPortion).toBeCloseTo(3);
        expect(result.tipPortion).toBeCloseTo(3);
        expect(result.totalOwed).toBeCloseTo(36); // 30 + 3 + 3
      });
    });

    it('should handle decimal amounts correctly', () => {
      const decimalClaims: ParticipantClaim[] = [
        { userId: 'user1', itemsTotal: 15.99 },
        { userId: 'user2', itemsTotal: 12.5 },
      ];

      const results = calculateParticipantTotals(
        decimalClaims,
        28.49, // subtotal
        2.85, // tax
        5.0, // tip
        0, // no unclaimed items
        { tip: 'proportional', tax: 'proportional' }
      );

      // Verify totals sum correctly
      const totalOwed = results.reduce((sum, r) => sum + r.totalOwed, 0);
      expect(totalOwed).toBeCloseTo(28.49 + 2.85 + 5.0);
    });
  });
});
