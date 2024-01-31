export const addDaysToDate = function addDaysToDate(
  date: Date,
  daysToAdd: number,
): Date {
  return new Date(date.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
};

export const formatDateForSQLDateTime = function formatDateForSQLDateTime(
  date: Date,
): string {
  return date.toISOString().replace("T", " ").replace(
    "Z",
    "",
  );
};

export const formatDateForSQLDate = function formatDateForSQLDateTime(
  date: Date,
): string {
  return date.toISOString().slice(0, 10);
};

export const compareDates = function compareDates(
  date1: Date,
  date2: Date,
): boolean {
  return date1.getTime() > date2.getTime();
};
