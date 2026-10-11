import dayjs from "dayjs";

/** Inclusive calendar days in one allowance year, including cross-year requests. */
export function leaveDaysInYear(startsAt: string, endsAt: string, year: number): number {
  const yearStart = dayjs(`${year}-01-01`);
  const yearEnd = yearStart.endOf("year");
  const startDate = dayjs(startsAt);
  const endDate = dayjs(endsAt);
  if (!startDate.isValid() || !endDate.isValid()) return 0;
  const start = startDate.isBefore(yearStart) ? yearStart : startDate;
  const end = endDate.isAfter(yearEnd) ? yearEnd : endDate;
  return Math.max(0, end.startOf("day").diff(start.startOf("day"), "day") + 1);
}
