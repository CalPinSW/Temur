import { toDateKey, groupByDay } from '../utils/calendarUtils';

describe('calendarUtils', () => {
  describe('toDateKey', () => {
    it('formats a local date as YYYY-MM-DD, zero-padded', () => {
      expect(toDateKey(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
      expect(toDateKey(new Date(2026, 11, 31))).toBe('2026-12-31');
    });
  });

  describe('groupByDay', () => {
    it('buckets items by the local calendar day of their date', () => {
      const items = [
        { id: 'a', at: new Date(2026, 3, 11, 9, 0) },
        { id: 'b', at: new Date(2026, 3, 11, 20, 0) },
        { id: 'c', at: new Date(2026, 3, 12, 10, 0) },
      ];
      const byDay = groupByDay(items, (i) => i.at);
      expect(Object.keys(byDay).sort()).toEqual(['2026-04-11', '2026-04-12']);
      expect(byDay['2026-04-11'].map((i) => i.id)).toEqual(['a', 'b']);
      expect(byDay['2026-04-12'].map((i) => i.id)).toEqual(['c']);
    });

    it('returns an empty object for no items', () => {
      expect(groupByDay([], () => new Date())).toEqual({});
    });
  });
});
