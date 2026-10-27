import { describe, expect, it } from 'vitest';

import {
  applyTimelineDrag,
  dayFromOffset,
  fromDayIndex,
  getTimelineBar,
  getTimelineHeader,
  getTimelineRange,
  getTimelineWidth,
  isWeekend,
  offsetFromDay,
  timelineDayWidth,
  toDayIndex,
} from '../view-presets/timeline/index.js';

const day = (value: string) =>
  toDayIndex(new Date(`${value}T00:00:00`).getTime());

describe('timeline day index', () => {
  it('round-trips through local midnight', () => {
    const index = day('2026-03-15');
    const back = new Date(fromDayIndex(index));
    expect(back.getFullYear()).toBe(2026);
    expect(back.getMonth()).toBe(2);
    expect(back.getDate()).toBe(15);
    expect(back.getHours()).toBe(0);
  });

  it('ignores the time of day', () => {
    expect(toDayIndex(new Date('2026-03-15T23:30:00').getTime())).toBe(
      day('2026-03-15')
    );
    expect(toDayIndex(new Date('2026-03-15T00:01:00').getTime())).toBe(
      day('2026-03-15')
    );
  });

  it('counts consecutive days across month and year ends', () => {
    expect(day('2026-01-01') - day('2025-12-31')).toBe(1);
    expect(day('2026-03-01') - day('2026-02-28')).toBe(1);
    expect(day('2024-03-01') - day('2024-02-28')).toBe(2);
  });

  it('detects weekends', () => {
    expect(isWeekend(day('2026-10-24'))).toBe(true); // Saturday
    expect(isWeekend(day('2026-10-25'))).toBe(true); // Sunday
    expect(isWeekend(day('2026-10-26'))).toBe(false); // Monday
  });
});

describe('timeline range', () => {
  it('covers every span and today, aligned to months', () => {
    const today = day('2026-10-27');
    const range = getTimelineRange(
      [
        { start: day('2026-03-02'), end: day('2026-07-03') },
        { start: day('2027-01-10'), end: day('2027-02-01') },
      ],
      today,
      'month'
    );
    const start = new Date(fromDayIndex(range.startDay));
    const end = new Date(fromDayIndex(range.endDay));
    expect(start.getDate()).toBe(1);
    expect(end.getDate()).toBe(1);
    expect(range.startDay).toBeLessThan(day('2026-03-02'));
    expect(range.endDay).toBeGreaterThan(day('2027-02-01'));
  });

  it('aligns quarter and year zooms to whole years', () => {
    const range = getTimelineRange([], day('2026-10-27'), 'year');
    const start = new Date(fromDayIndex(range.startDay));
    const end = new Date(fromDayIndex(range.endDay));
    expect([start.getMonth(), start.getDate()]).toEqual([0, 1]);
    expect([end.getMonth(), end.getDate()]).toEqual([0, 1]);
  });
});

describe('timeline header', () => {
  const range = { startDay: day('2026-01-01'), endDay: day('2026-04-01') };

  it('tiles the full width without gaps for every zoom', () => {
    for (const zoom of ['day', 'week', 'month', 'quarter', 'year'] as const) {
      const header = getTimelineHeader(range, zoom);
      const width = getTimelineWidth(range, zoom);
      for (const row of [header.top, header.bottom]) {
        expect(row[0]?.left).toBe(0);
        for (let i = 1; i < row.length; i++) {
          expect(row[i]!.left).toBeCloseTo(
            row[i - 1]!.left + row[i - 1]!.width
          );
        }
        const last = row.at(-1)!;
        expect(last.left + last.width).toBeCloseTo(width);
      }
    }
  });

  it('labels months and quarters', () => {
    const quarter = getTimelineHeader(range, 'quarter');
    expect(quarter.top.map(t => t.label)).toEqual(['2026']);
    expect(quarter.bottom).toHaveLength(3);
    const year = getTimelineHeader(range, 'year');
    expect(year.bottom.map(t => t.label)).toEqual(['Q1']);
  });

  it('starts week ticks on Monday in month zoom', () => {
    const header = getTimelineHeader(range, 'month');
    // 2026-01-01 is a Thursday: the first tick is clipped, the second is Monday the 5th
    expect(header.bottom[1]?.startDay).toBe(day('2026-01-05'));
    expect(header.bottom[1]?.label).toBe('5');
  });
});

describe('timeline bars', () => {
  const range = { startDay: day('2026-01-01'), endDay: day('2026-12-31') };

  it('places inclusive spans on the day grid', () => {
    const bar = getTimelineBar(
      { start: day('2026-01-03'), end: day('2026-01-05') },
      range,
      'week'
    );
    expect(bar.left).toBe(2 * timelineDayWidth.week);
    expect(bar.width).toBe(3 * timelineDayWidth.week);
  });

  it('keeps tiny bars visible', () => {
    const bar = getTimelineBar(
      { start: day('2026-01-03'), end: day('2026-01-03') },
      range,
      'year'
    );
    expect(bar.width).toBeGreaterThanOrEqual(6);
  });

  it('converts between offsets and days', () => {
    const target = day('2026-02-14');
    const x = offsetFromDay(target, range, 'month');
    expect(dayFromOffset(x, range, 'month')).toBe(target);
    expect(
      dayFromOffset(x + timelineDayWidth.month - 0.1, range, 'month')
    ).toBe(target);
  });
});

describe('timeline drag', () => {
  const span = { start: 10, end: 20 };

  it('moves both ends', () => {
    expect(applyTimelineDrag(span, 'move', 5)).toEqual({ start: 15, end: 25 });
  });

  it('resizes one end without crossing the other', () => {
    expect(applyTimelineDrag(span, 'start', 3)).toEqual({ start: 13, end: 20 });
    expect(applyTimelineDrag(span, 'start', 30)).toEqual({
      start: 20,
      end: 20,
    });
    expect(applyTimelineDrag(span, 'end', -30)).toEqual({ start: 10, end: 10 });
  });
});
