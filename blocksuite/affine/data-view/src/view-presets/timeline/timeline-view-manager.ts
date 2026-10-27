import { computed, type ReadonlySignal } from '@preact/signals-core';

import { getColorByColor } from '../../core/component/tags/colors.js';
import type { SelectTag } from '../../core/logical/type-presets.js';
import type { Row } from '../../core/view-manager/row.js';
import type { ViewManager } from '../../core/view-manager/view-manager.js';
import type { TableViewData } from '../table/define.js';
import { TableSingleView } from '../table/table-view-manager.js';
import type { TimelineViewData } from './define.js';
import {
  applyTimelineDrag,
  fromDayIndex,
  type TimelineSpan,
  type TimelineZoom,
  toDayIndex,
} from './layout.js';

export type TimelineDateMapping =
  | { status: 'ready'; propertyId: string }
  | { status: 'setup'; propertyId?: string };

export type TimelineItem = {
  rowId: string;
  title: string;
  /** Day indexes, both inclusive. Undefined when the row has no start date. */
  span?: TimelineSpan;
  color?: string;
  barProperties: string[];
};

export type TimelineGroup = {
  key: string;
  name: string;
  rows: Row[];
};

const isValidTimestamp = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const DAY = 86_400_000;

/**
 * The timeline keeps all of the table view's behaviour (filter, sort, group,
 * property order and visibility for the side table) and adds the date mapping
 * and timeline settings on top. Its stored data is a superset of the table's.
 */
export class TimelineSingleView extends TableSingleView {
  timelineData$ = computed(
    () => this.data$.value as unknown as TimelineViewData | undefined
  );

  timelineDataUpdate(
    updater: (data: TimelineViewData) => Partial<TimelineViewData>
  ) {
    this.dataUpdate(
      data =>
        updater(
          data as unknown as TimelineViewData
        ) as unknown as Partial<TableViewData>
    );
  }

  override get type(): string {
    return this.timelineData$.value?.mode ?? 'timeline';
  }

  private settings$ = computed(() => {
    return (
      this.timelineData$.value?.timeline ?? {
        zoom: 'month' as TimelineZoom,
        showTable: true,
      }
    );
  });

  zoom$ = computed(() => this.settings$.value.zoom ?? 'month');

  showTable$ = computed(() => this.settings$.value.showTable ?? true);

  tableWidth$ = computed(() => this.settings$.value.tableWidth ?? 360);

  dateProperties$ = computed(() =>
    this.propertiesRaw$.value.filter(
      property => property.type$.value === 'date'
    )
  );

  colorProperties$ = computed(() =>
    this.propertiesRaw$.value.filter(
      property =>
        property.type$.value === 'select' ||
        property.type$.value === 'multi-select'
    )
  );

  private dateMapping(propertyId: string | undefined): TimelineDateMapping {
    if (
      propertyId &&
      this.dataSource.properties$.value.includes(propertyId) &&
      this.dataSource.propertyTypeGet(propertyId) === 'date'
    ) {
      return { status: 'ready', propertyId };
    }
    return { status: 'setup', propertyId };
  }

  startDateMapping$: ReadonlySignal<TimelineDateMapping> = computed(() =>
    this.dateMapping(this.timelineData$.value?.date?.startColumnId)
  );

  endDateMapping$: ReadonlySignal<TimelineDateMapping> = computed(() =>
    this.dateMapping(this.timelineData$.value?.date?.endColumnId)
  );

  colorPropertyId$ = computed(() => {
    const id = this.settings$.value.colorColumnId;
    return id && this.colorProperties$.value.some(p => p.id === id)
      ? id
      : undefined;
  });

  barPropertyIds$ = computed(() => {
    const ids = this.settings$.value.barPropertyIds ?? [];
    const existing = new Set(this.dataSource.properties$.value);
    return ids.filter(id => existing.has(id));
  });

  /** Properties shown as columns in the side table. */
  tableProperties$ = computed(() => this.properties$.value);

  private titleOf(rowId: string) {
    const titleColumn =
      this.mainProperties$.value.titleColumn ??
      this.propertiesRaw$.value.find(p => p.type$.value === 'title')?.id;
    if (!titleColumn) return '';
    return this.cellGetOrCreate(rowId, titleColumn).stringValue$.value ?? '';
  }

  private colorOf(rowId: string): string | undefined {
    const propertyId = this.colorPropertyId$.value;
    if (!propertyId) return;
    const property = this.propertyGetOrCreate(propertyId);
    const options = (property.data$.value as { options?: SelectTag[] })
      ?.options;
    const value = this.cellGetOrCreate(rowId, propertyId).jsonValue$.value;
    const id = Array.isArray(value) ? value[0] : value;
    const color = options?.find(option => option.id === id)?.color;
    return color ? getColorByColor(color) : undefined;
  }

  spanOf(rowId: string): TimelineSpan | undefined {
    const start = this.startDateMapping$.value;
    if (start.status !== 'ready') return;
    const startAt = this.cellGetOrCreate(rowId, start.propertyId).jsonValue$
      .value;
    if (!isValidTimestamp(startAt)) return;
    const end = this.endDateMapping$.value;
    const endAt =
      end.status === 'ready'
        ? this.cellGetOrCreate(rowId, end.propertyId).jsonValue$.value
        : undefined;
    const startDay = toDayIndex(startAt);
    const endDay = isValidTimestamp(endAt) ? toDayIndex(endAt) : startDay;
    return { start: startDay, end: Math.max(startDay, endDay) };
  }

  itemOf(rowId: string): TimelineItem {
    return {
      rowId,
      title: this.titleOf(rowId),
      span: this.spanOf(rowId),
      color: this.colorOf(rowId),
      barProperties: this.barPropertyIds$.value.flatMap(propertyId => {
        const value = this.cellGetOrCreate(rowId, propertyId).stringValue$
          .value;
        return value ? [value] : [];
      }),
    };
  }

  items$ = computed(() => this.rows$.value.map(row => this.itemOf(row.rowId)));

  /** Undefined when the view isn't grouped. */
  groups$: ReadonlySignal<TimelineGroup[] | undefined> = computed(() => {
    const groups = this.groupTrait.groupsDataList$.value;
    if (!groups) return;
    return groups.flatMap(group =>
      group
        ? [
            {
              key: group.key,
              name: group.name$.value || 'No value',
              rows: group.rows,
            },
          ]
        : []
    );
  });

  // --- settings -----------------------------------------------------------

  setZoom(zoom: TimelineZoom) {
    this.timelineDataUpdate(data => ({
      timeline: { ...data.timeline, zoom },
    }));
  }

  setShowTable(showTable: boolean) {
    this.timelineDataUpdate(data => ({
      timeline: { ...data.timeline, showTable },
    }));
  }

  setTableWidth(tableWidth: number) {
    this.timelineDataUpdate(data => ({
      timeline: { ...data.timeline, tableWidth: Math.round(tableWidth) },
    }));
  }

  setColorProperty(colorColumnId: string | undefined) {
    this.timelineDataUpdate(data => ({
      timeline: { ...data.timeline, colorColumnId },
    }));
  }

  toggleBarProperty(propertyId: string) {
    this.timelineDataUpdate(data => {
      const ids = data.timeline?.barPropertyIds ?? [];
      return {
        timeline: {
          ...data.timeline,
          barPropertyIds: ids.includes(propertyId)
            ? ids.filter(id => id !== propertyId)
            : [...ids, propertyId],
        },
      };
    });
  }

  setStartDateColumn(startColumnId: string) {
    this.timelineDataUpdate(data => ({
      date: { ...data.date, startColumnId },
    }));
  }

  setEndDateColumn(endColumnId: string | undefined) {
    this.timelineDataUpdate(data => ({
      date: { ...data.date, endColumnId },
    }));
  }

  createDateColumn(edge: 'start' | 'end') {
    const id = this.propertyAdd('end', {
      type: 'date',
      name: edge === 'start' ? 'Start' : 'End',
    });
    if (id) {
      if (edge === 'start') this.setStartDateColumn(id);
      else this.setEndDateColumn(id);
    }
    return id;
  }

  // --- editing dates ------------------------------------------------------

  /**
   * Writes a span back to the date cells. Moving keeps each cell's time of day
   * (shifted by whole days); setting a fresh date uses local midnight.
   */
  setSpan(rowId: string, span: TimelineSpan) {
    const start = this.startDateMapping$.value;
    if (start.status !== 'ready' || this.readonly$.value) return;
    const end = this.endDateMapping$.value;
    const write = (propertyId: string, day: number) => {
      const cell = this.cellGetOrCreate(rowId, propertyId);
      const old = cell.jsonValue$.value;
      cell.jsonValueSet(
        isValidTimestamp(old)
          ? old + (day - toDayIndex(old)) * DAY
          : fromDayIndex(day)
      );
    };
    write(start.propertyId, span.start);
    if (end.status === 'ready') {
      write(end.propertyId, span.end);
    }
  }

  dragSpan(rowId: string, mode: 'move' | 'start' | 'end', deltaDays: number) {
    const span = this.spanOf(rowId);
    if (!span || deltaDays === 0) return;
    this.setSpan(rowId, applyTimelineDrag(span, mode, deltaDays));
  }

  /** Gives an undated row a date, as a single day (or a short range). */
  scheduleRow(rowId: string, day: number, length = 1) {
    const end = this.endDateMapping$.value;
    this.setSpan(rowId, {
      start: day,
      end: end.status === 'ready' ? day + Math.max(length, 1) - 1 : day,
    });
  }

  createRowOnDay(day: number, groupKey?: string) {
    if (this.readonly$.value) return;
    const rowId = this.rowAdd('end', groupKey);
    if (rowId) this.scheduleRow(rowId, day, 7);
    return rowId;
  }

  constructor(viewManager: ViewManager, viewId: string) {
    super(viewManager, viewId);
  }
}
