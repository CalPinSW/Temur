import {
  toDateKey,
  groupByDay,
  getMonthGrid,
  addMonths,
  isSameMonth,
  isSameDay,
  formatMonthTitle,
} from '../utils/calendarUtils';

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
  });

  describe('getMonthGrid', () => {
    it('returns 6 weeks of 7 days, weeks starting Monday, spilling into adjacent months', () => {
      // April 2026: the 1st is a Wednesday.
      const grid = getMonthGrid(2026, 3);
      expect(grid).toHaveLength(6);
      expect(grid.every((w) => w.length === 7)).toBe(true);
      expect(grid[0].map(toDateKey)).toEqual([
        '2026-03-30',
        '2026-03-31',
        '2026-04-01',
        '2026-04-02',
        '2026-04-03',
        '2026-04-04',
        '2026-04-05',
      ]);
      // Every cell is a real consecutive date.
      const flat = grid.flat();
      for (let i = 1; i < flat.length; i++) {
        expect(toDateKey(flat[i])).toBe(
          toDateKey(new Date(flat[i - 1].getFullYear(), flat[i - 1].getMonth(), flat[i - 1].getDate() + 1))
        );
      }
    });

    it('starts on the 1st when the month begins on a Monday', () => {
      // June 2026 starts on a Monday.
      const grid = getMonthGrid(2026, 5);
      expect(toDateKey(grid[0][0])).toBe('2026-06-01');
    });
  });

  describe('addMonths / isSameMonth / isSameDay', () => {
    it('addMonths returns the first of the shifted month', () => {
      expect(toDateKey(addMonths(new Date(2026, 11, 20), 1))).toBe('2027-01-01');
      expect(toDateKey(addMonths(new Date(2026, 0, 10), -1))).toBe('2025-12-01');
    });

    it('isSameMonth ignores the day', () => {
      expect(isSameMonth(new Date(2026, 3, 1), new Date(2026, 3, 30))).toBe(true);
      expect(isSameMonth(new Date(2026, 3, 30), new Date(2026, 4, 1))).toBe(false);
    });

    it('isSameDay compares y/m/d only', () => {
      expect(isSameDay(new Date(2026, 3, 11, 0, 1), new Date(2026, 3, 11, 23, 59))).toBe(true);
      expect(isSameDay(new Date(2026, 3, 11), new Date(2026, 3, 12))).toBe(false);
    });
  });

  describe('formatMonthTitle', () => {
    it('is "Month YYYY"', () => {
      expect(formatMonthTitle(new Date(2026, 8, 1))).toBe('September 2026');
    });
  });
});
