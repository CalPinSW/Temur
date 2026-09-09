// Small calendar helpers. Works in local time — a "day" is a wall-clock
// calendar day, matching how kickoff times are shown.

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
