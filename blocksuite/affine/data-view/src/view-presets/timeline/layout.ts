export type TimelineZoom = 'day' | 'week' | 'month' | 'quarter' | 'year';

export const timelineZooms: { zoom: TimelineZoom; name: string }[] = [
  { zoom: 'day', name: 'Day' },
  { zoom: 'week', name: 'Week' },
  { zoom: 'month', name: 'Month' },
  { zoom: 'quarter', name: 'Quarter' },
  { zoom: 'year', name: 'Year' },
];

const DAY = 86_400_000;

/** Pixels per day for each zoom level. */
export const timelineDayWidth: Record<TimelineZoom, number> = {
  day: 56,
  week: 28,
  month: 8,
  quarter: 2.6,
  year: 0.9,
};

/** Empty space kept around the data, in days. */
const timelinePadding: Record<TimelineZoom, number> = {
  day: 14,
  week: 28,
  month: 62,
  quarter: 183,
  year: 366,
};

/**
 * Days are counted as whole calendar days in local time, independent of DST:
 * a day index is the UTC day number of the local calendar date.
 */
export const toDayIndex = (time: number | Date) => {
  const date = time instanceof Date ? time : new Date(time);
  return Math.round(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY
  );
};

/** Local midnight of a day index. */
export const fromDayIndex = (day: number) => {
  const utc = new Date(day * DAY);
  return new Date(
    utc.getUTCFullYear(),
    utc.getUTCMonth(),
    utc.getUTCDate()
  ).getTime();
};

const dayParts = (day: number) => {
  const utc = new Date(day * DAY);
  return {
    year: utc.getUTCFullYear(),
    month: utc.getUTCMonth(),
    date: utc.getUTCDate(),
    weekday: utc.getUTCDay(),
  };
};

const dayOf = (year: number, month: number, date = 1) =>
  Math.round(Date.UTC(year, month, date) / DAY);

export const isWeekend = (day: number) => {
  const weekday = dayParts(day).weekday;
  return weekday === 0 || weekday === 6;
};

/** Monday on or before the day. */
const startOfWeek = (day: number) => day - ((dayParts(day).weekday + 6) % 7);

const startOfMonth = (day: number) => {
  const { year, month } = dayParts(day);
  return dayOf(year, month);
};

const startOfQuarter = (day: number) => {
  const { year, month } = dayParts(day);
  return dayOf(year, month - (month % 3));
};

const startOfYear = (day: number) => dayOf(dayParts(day).year, 0);

const addMonths = (day: number, months: number) => {
  const { year, month } = dayParts(day);
  return dayOf(year, month + months);
};

export type TimelineRange = {
  /** First visible day (inclusive). */
  startDay: number;
  /** Last visible day (exclusive). */
  endDay: number;
};

export type TimelineSpan = {
  start: number;
  end: number;
};

/**
 * Visible range: everything with a date plus today, padded, and aligned to the
 * header's top-level unit so header cells are never cut in half at the edges.
 */
export const getTimelineRange = (
  spans: TimelineSpan[],
  today: number,
  zoom: TimelineZoom
): TimelineRange => {
  let min = today;
  let max = today;
  for (const span of spans) {
    min = Math.min(min, span.start);
    max = Math.max(max, span.end);
  }
  const pad = timelinePadding[zoom];
  const alignStart =
    zoom === 'quarter' || zoom === 'year' ? startOfYear : startOfMonth;
  const startDay = alignStart(min - pad);
  const lastDay = max + pad;
  const endDay =
    zoom === 'quarter' || zoom === 'year'
      ? dayOf(dayParts(lastDay).year + 1, 0)
      : addMonths(startOfMonth(lastDay), 1);
  return { startDay, endDay };
};

export type TimelineTick = {
  startDay: number;
  endDay: number;
  label: string;
  left: number;
  width: number;
};

export type TimelineHeader = {
  top: TimelineTick[];
  bottom: TimelineTick[];
};

const monthShort = (month: number, year: number) =>
  new Date(year, month, 1).toLocaleString(undefined, { month: 'short' });

const monthLong = (month: number, year: number) =>
  new Date(year, month, 1).toLocaleString(undefined, {
    month: 'long',
    year: 'numeric',
  });

const weekdayShort = (day: number) =>
  new Date(fromDayIndex(day)).toLocaleString(undefined, { weekday: 'short' });

const ticks = (
  range: TimelineRange,
  dayWidth: number,
  first: (day: number) => number,
  next: (day: number) => number,
  label: (day: number) => string
): TimelineTick[] => {
  const result: TimelineTick[] = [];
  for (let day = first(range.startDay); day < range.endDay; day = next(day)) {
    const startDay = Math.max(day, range.startDay);
    const endDay = Math.min(next(day), range.endDay);
    result.push({
      startDay,
      endDay,
      label: label(day),
      left: (startDay - range.startDay) * dayWidth,
      width: (endDay - startDay) * dayWidth,
    });
  }
  return result;
};

export const getTimelineHeader = (
  range: TimelineRange,
  zoom: TimelineZoom
): TimelineHeader => {
  const dayWidth = timelineDayWidth[zoom];
  const months = (label: (day: number) => string) =>
    ticks(range, dayWidth, startOfMonth, day => addMonths(day, 1), label);
  const years = () =>
    ticks(
      range,
      dayWidth,
      startOfYear,
      day => dayOf(dayParts(day).year + 1, 0),
      day => `${dayParts(day).year}`
    );
  const longMonth = (day: number) => {
    const { month, year } = dayParts(day);
    return monthLong(month, year);
  };
  switch (zoom) {
    case 'day':
      return {
        top: months(longMonth),
        bottom: ticks(
          range,
          dayWidth,
          day => day,
          day => day + 1,
          day => `${weekdayShort(day)} ${dayParts(day).date}`
        ),
      };
    case 'week':
      return {
        top: months(longMonth),
        bottom: ticks(
          range,
          dayWidth,
          day => day,
          day => day + 1,
          day => `${dayParts(day).date}`
        ),
      };
    case 'month':
      return {
        top: months(longMonth),
        bottom: ticks(
          range,
          dayWidth,
          startOfWeek,
          day => day + 7,
          day => `${dayParts(day).date}`
        ),
      };
    case 'quarter':
      return {
        top: years(),
        bottom: months(day => {
          const { month, year } = dayParts(day);
          return monthShort(month, year);
        }),
      };
    case 'year':
      return {
        top: years(),
        bottom: ticks(
          range,
          dayWidth,
          startOfQuarter,
          day => addMonths(day, 3),
          day => `Q${Math.floor(dayParts(day).month / 3) + 1}`
        ),
      };
  }
};

export type TimelineBar = {
  left: number;
  width: number;
};

/** Geometry of a bar covering [start, end] (both inclusive). */
export const getTimelineBar = (
  span: TimelineSpan,
  range: TimelineRange,
  zoom: TimelineZoom
): TimelineBar => {
  const dayWidth = timelineDayWidth[zoom];
  const start = Math.min(span.start, span.end);
  const end = Math.max(span.start, span.end);
  return {
    left: (start - range.startDay) * dayWidth,
    width: Math.max((end - start + 1) * dayWidth, 6),
  };
};

export const getTimelineWidth = (range: TimelineRange, zoom: TimelineZoom) =>
  (range.endDay - range.startDay) * timelineDayWidth[zoom];

export const dayFromOffset = (
  offset: number,
  range: TimelineRange,
  zoom: TimelineZoom
) => range.startDay + Math.floor(offset / timelineDayWidth[zoom]);

export const offsetFromDay = (
  day: number,
  range: TimelineRange,
  zoom: TimelineZoom
) => (day - range.startDay) * timelineDayWidth[zoom];

/** Applies a drag to a span: move both ends, or one end without crossing the other. */
export const applyTimelineDrag = (
  span: TimelineSpan,
  mode: 'move' | 'start' | 'end',
  deltaDays: number
): TimelineSpan => {
  switch (mode) {
    case 'move':
      return { start: span.start + deltaDays, end: span.end + deltaDays };
    case 'start':
      return {
        start: Math.min(span.start + deltaDays, span.end),
        end: span.end,
      };
    case 'end':
      return {
        start: span.start,
        end: Math.max(span.end + deltaDays, span.start),
      };
  }
};
