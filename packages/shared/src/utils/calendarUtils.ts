// Calendar helpers shared by web's hand-rolled month grid and mobile's
// react-native-calendars view. All work in local time — a "day" is a
// wall-clock calendar day, matching how kickoff times are shown.

// Local YYYY-MM-DD key for a date. Used to bucket games by day and as the
// date key react-native-calendars expects.
export const toDateKey = (date: Date): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

// Buckets items by the local calendar day of the date returned by
// `getDate`, keyed by `toDateKey`.
export const groupByDay = <T>(items: T[], getDate: (item: T) => Date): Record<string, T[]> => {
  const byDay: Record<string, T[]> = {};
  for (const item of items) {
    const key = toDateKey(getDate(item));
    (byDay[key] ??= []).push(item);
  }
  return byDay;
};

// The 6x7 grid of days for a month view, weeks starting Monday (UK). The
// first and last rows spill into the adjacent months so every cell is a
// real date. `month` is 0-indexed.
export const getMonthGrid = (year: number, month: number): Date[][] => {
  const firstOfMonth = new Date(year, month, 1);
  // How many days to step back to reach the Monday on or before the 1st
  // (getDay: Sun=0 … Sat=6).
  const offsetToMonday = (firstOfMonth.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - offsetToMonday);

  const weeks: Date[][] = [];
  for (let w = 0; w < 6; w++) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7 + d));
    }
    weeks.push(week);
  }
  return weeks;
};

export const addMonths = (date: Date, delta: number): Date =>
  new Date(date.getFullYear(), date.getMonth() + delta, 1);

export const isSameMonth = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

export const isSameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

export const formatMonthTitle = (date: Date): string =>
  `${MONTH_LABELS[date.getMonth()]} ${date.getFullYear()}`;
