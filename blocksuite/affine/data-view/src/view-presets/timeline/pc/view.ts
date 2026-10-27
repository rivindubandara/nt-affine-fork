import {
  menu,
  type MenuConfig,
  popFilterableSimpleMenu,
  popupTargetFromElement,
} from '@blocksuite/affine-components/context-menu';
import type { InsertToPosition } from '@blocksuite/affine-shared/utils';
import {
  ArrowDownSmallIcon,
  ArrowLeftSmallIcon,
  ArrowRightSmallIcon,
  DatabaseTableViewIcon,
  DateTimeIcon,
  PlusIcon,
  TodayIcon,
} from '@blocksuite/icons/lit';
import { signal } from '@preact/signals-core';
import { html, nothing, type TemplateResult } from 'lit';
import { ref } from 'lit/directives/ref.js';
import { repeat } from 'lit/directives/repeat.js';

import {
  createUniComponentFromWebComponent,
  renderUniLit,
} from '../../../core/index.js';
import {
  DataViewUIBase,
  DataViewUILogicBase,
} from '../../../core/view/data-view-base.js';
import type { Property } from '../../../core/view-manager/property.js';
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
  type TimelineRange,
  type TimelineSpan,
  timelineDayWidth,
  type TimelineZoom,
  timelineZooms,
  toDayIndex,
} from '../layout.js';
import type {
  TimelineItem,
  TimelineSingleView,
} from '../timeline-view-manager.js';
import { timelineViewStyles } from './styles.js';

const ROW_HEIGHT = 34;
const HEADER_HEIGHT = 52;
const MIN_TABLE_WIDTH = 160;
const MAX_TABLE_WIDTH = 900;
/** Pointer travel (px) below which a press on a bar counts as a click. */
const CLICK_SLOP = 4;

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

/** Hands the rendered element to a callback. */
const refTo = (cb: (el: HTMLElement) => void) =>
  ref(el => {
    if (el instanceof HTMLElement) cb(el);
  });

type DragState = {
  rowId: string;
  mode: 'move' | 'start' | 'end';
  originX: number;
  deltaDays: number;
  moved: boolean;
};

type Lane =
  | { type: 'group'; key: string; name: string; count: number }
  | { type: 'row'; item: TimelineItem; groupKey?: string }
  | { type: 'add'; groupKey?: string };

export class TimelineViewUILogic extends DataViewUILogicBase<TimelineSingleView> {
  private ui?: TimelineViewUI;

  drag$ = signal<DragState | undefined>(undefined);

  /** Day under the pointer in an undated row's lane, for the placement ghost. */
  hover$ = signal<{ rowId: string; day: number } | undefined>(undefined);

  collapsedGroups$ = signal<Set<string>>(new Set());

  /** Day to bring into view after the next render (initial load, zoom change). */
  pendingScrollDay: number | undefined = toDayIndex(Date.now());

  private suppressClick = false;

  private cleanupPointer?: () => void;

  renderer = createUniComponentFromWebComponent(TimelineViewUI);

  clearSelection = () => {
    this.setSelection(undefined);
  };

  addRow = (position: InsertToPosition) => {
    if (this.view.readonly$.value) return;
    const rowId = this.view.rowAdd(position);
    if (rowId) this.root.openDetailPanel({ view: this.view, rowId });
    return rowId;
  };

  focusFirstCell = () => {};

  showIndicator = () => false;

  hideIndicator = () => {};

  moveTo = () => {};

  attach(ui: TimelineViewUI) {
    this.ui = ui;
  }

  detach(ui: TimelineViewUI) {
    if (this.ui !== ui) return;
    this.cleanupPointer?.();
    this.ui = undefined;
  }

  get readonly() {
    return this.view.readonly$.value;
  }

  // --- range & navigation ---------------------------------------------------

  range(): TimelineRange {
    const spans = this.view.items$.value.flatMap(item =>
      item.span ? [item.span] : []
    );
    return getTimelineRange(
      spans,
      toDayIndex(Date.now()),
      this.view.zoom$.value
    );
  }

  setZoom(zoom: TimelineZoom) {
    this.pendingScrollDay = this.ui?.centerDay();
    this.view.setZoom(zoom);
  }

  goToday() {
    this.ui?.scrollToDay(toDayIndex(Date.now()), 'smooth');
  }

  page(direction: -1 | 1) {
    this.ui?.scrollByPage(direction);
  }

  openRow(rowId: string) {
    this.root.openDetailPanel({ view: this.view, rowId });
  }

  newRow(groupKey?: string) {
    const rowId = this.view.createRowOnDay(
      this.ui?.centerDay() ?? toDayIndex(Date.now()),
      groupKey
    );
    if (rowId) this.openRow(rowId);
  }

  toggleGroup(key: string) {
    const next = new Set(this.collapsedGroups$.value);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    this.collapsedGroups$.value = next;
  }

  lanes(): Lane[] {
    const groups = this.view.groups$.value;
    const items = new Map(
      this.view.items$.value.map(item => [item.rowId, item])
    );
    const canAdd = !this.readonly;
    if (!groups) {
      const lanes: Lane[] = this.view.items$.value.map(item => ({
        type: 'row',
        item,
      }));
      if (canAdd) lanes.push({ type: 'add' });
      return lanes;
    }
    return groups.flatMap(group => {
      const lanes: Lane[] = [
        {
          type: 'group',
          key: group.key,
          name: group.name,
          count: group.rows.length,
        },
      ];
      if (this.collapsedGroups$.value.has(group.key)) return lanes;
      for (const row of group.rows) {
        const item = items.get(row.rowId) ?? this.view.itemOf(row.rowId);
        lanes.push({ type: 'row', item, groupKey: group.key });
      }
      if (canAdd) lanes.push({ type: 'add', groupKey: group.key });
      return lanes;
    });
  }

  /** The span to draw for an item, including an in-progress drag. */
  displaySpan(item: TimelineItem): TimelineSpan | undefined {
    const drag = this.drag$.value;
    if (item.span && drag && drag.rowId === item.rowId) {
      return applyTimelineDrag(item.span, drag.mode, drag.deltaDays);
    }
    return item.span;
  }

  // --- pointer interactions -------------------------------------------------

  startDrag(item: TimelineItem, mode: DragState['mode'], event: PointerEvent) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    this.cleanupPointer?.();
    const zoom = this.view.zoom$.value;
    const dayWidth = timelineDayWidth[zoom];
    const canEdit = !this.readonly && !!item.span;
    this.drag$.value = {
      rowId: item.rowId,
      mode,
      originX: event.clientX,
      deltaDays: 0,
      moved: false,
    };
    const doc = (event.currentTarget as HTMLElement).ownerDocument;

    const onMove = (e: PointerEvent) => {
      const drag = this.drag$.value;
      if (!drag) return;
      const dx = e.clientX - drag.originX;
      const moved = drag.moved || Math.abs(dx) > CLICK_SLOP;
      const deltaDays = canEdit && moved ? Math.round(dx / dayWidth) : 0;
      if (moved !== drag.moved || deltaDays !== drag.deltaDays) {
        this.drag$.value = { ...drag, moved, deltaDays };
      }
    };
    const onUp = () => {
      cleanup();
      const drag = this.drag$.value;
      this.drag$.value = undefined;
      if (!drag) return;
      if (!drag.moved) {
        this.openRow(drag.rowId);
        return;
      }
      if (drag.deltaDays !== 0) {
        this.view.dragSpan(drag.rowId, drag.mode, drag.deltaDays);
      }
      this.suppressClick = true;
      requestAnimationFrame(() => {
        this.suppressClick = false;
      });
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cleanup();
        this.drag$.value = undefined;
      }
    };
    const cleanup = () => {
      doc.removeEventListener('pointermove', onMove);
      doc.removeEventListener('pointerup', onUp);
      doc.removeEventListener('keydown', onKey);
      if (this.cleanupPointer === cleanup) this.cleanupPointer = undefined;
    };
    this.cleanupPointer = cleanup;
    doc.addEventListener('pointermove', onMove);
    doc.addEventListener('pointerup', onUp);
    doc.addEventListener('keydown', onKey);
  }

  laneDay(event: MouseEvent, range: TimelineRange) {
    const lane = event.currentTarget as HTMLElement;
    const offset = event.clientX - lane.getBoundingClientRect().left;
    return dayFromOffset(offset, range, this.view.zoom$.value);
  }

  hoverLane(item: TimelineItem, event: MouseEvent, range: TimelineRange) {
    if (item.span || this.readonly || this.drag$.value) {
      if (this.hover$.value) this.hover$.value = undefined;
      return;
    }
    const day = this.laneDay(event, range);
    const hover = this.hover$.value;
    if (hover?.rowId !== item.rowId || hover.day !== day) {
      this.hover$.value = { rowId: item.rowId, day };
    }
  }

  leaveLane() {
    if (this.hover$.value) this.hover$.value = undefined;
  }

  clickLane(item: TimelineItem, event: MouseEvent, range: TimelineRange) {
    if (this.suppressClick || item.span || this.readonly) return;
    this.view.scheduleRow(item.rowId, this.laneDay(event, range), 1);
    this.hover$.value = undefined;
  }

  startTableResize(event: PointerEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.cleanupPointer?.();
    const startX = event.clientX;
    const startWidth = this.view.tableWidth$.value;
    const doc = (event.currentTarget as HTMLElement).ownerDocument;
    const clamp = (x: number) =>
      Math.min(MAX_TABLE_WIDTH, Math.max(MIN_TABLE_WIDTH, x));
    const onMove = (e: PointerEvent) => {
      this.ui?.previewTableWidth(clamp(startWidth + e.clientX - startX));
    };
    const onUp = (e: PointerEvent) => {
      cleanup();
      this.ui?.previewTableWidth(undefined);
      this.view.setTableWidth(clamp(startWidth + e.clientX - startX));
    };
    const cleanup = () => {
      doc.removeEventListener('pointermove', onMove);
      doc.removeEventListener('pointerup', onUp);
      if (this.cleanupPointer === cleanup) this.cleanupPointer = undefined;
    };
    this.cleanupPointer = cleanup;
    doc.addEventListener('pointermove', onMove);
    doc.addEventListener('pointerup', onUp);
  }

  // --- menus ----------------------------------------------------------------

  openSetupMenu(target: HTMLElement) {
    const items: MenuConfig[] = this.view.dateProperties$.value.map(property =>
      menu.action({
        name: property.name$.value || 'Date',
        select: () => this.view.setStartDateColumn(property.id),
      })
    );
    if (!this.readonly) {
      items.push(
        menu.action({
          name: 'Create start and end dates',
          select: () => {
            this.view.createDateColumn('start');
            this.view.createDateColumn('end');
          },
        }),
        menu.action({
          name: 'Create date property',
          select: () => {
            this.view.createDateColumn('start');
          },
        })
      );
    }
    popFilterableSimpleMenu(popupTargetFromElement(target), items);
  }

  private propertyPicker(
    properties: Property[],
    selected: string | undefined,
    onSelect: (id: string | undefined) => void,
    options: { includeNone?: boolean; create?: () => void } = {}
  ): MenuConfig[] {
    const items: MenuConfig[] = [];
    if (options.includeNone) {
      items.push(
        menu.action({
          name: 'None',
          isSelected: !selected,
          closeOnSelect: false,
          select: () => onSelect(undefined),
        })
      );
    }
    for (const property of properties) {
      items.push(
        menu.action({
          name: property.name$.value || 'Untitled',
          isSelected: property.id === selected,
          closeOnSelect: false,
          select: () => onSelect(property.id),
        })
      );
    }
    if (options.create && !this.readonly) {
      items.push(
        menu.action({
          name: 'Create date property',
          closeOnSelect: false,
          select: options.create,
        })
      );
    }
    return items;
  }

  private postfix(text: string) {
    return html`<div
        style="font-size:14px;color:var(--affine-text-secondary-color);"
      >
        ${text}
      </div>
      ${ArrowRightSmallIcon()}`;
  }

  /** Extra entries in the view's settings menu (called by the view-options widget). */
  getViewOptionsSettingItems(
    navigateToSubPage: (title: string, getItems: () => MenuConfig[]) => void,
    goBack: () => void
  ): MenuConfig[] {
    const view = this.view;
    const nameOf = (id: string | undefined, fallback: string) =>
      id ? view.propertyGetOrCreate(id).name$.value || fallback : fallback;
    const start = view.startDateMapping$.value;
    const end = view.endDateMapping$.value;
    return [
      menu.group({
        name: 'Timeline',
        items: [
          menu.action({
            name: 'Start date',
            prefix: TodayIcon(),
            closeOnSelect: false,
            postfix: this.postfix(
              start.status === 'ready'
                ? nameOf(start.propertyId, 'Date')
                : 'None'
            ),
            select: () =>
              navigateToSubPage('Start date', () =>
                this.propertyPicker(
                  view.dateProperties$.value,
                  start.propertyId,
                  id => {
                    if (id) view.setStartDateColumn(id);
                    goBack();
                  },
                  {
                    create: () => {
                      view.createDateColumn('start');
                      goBack();
                    },
                  }
                )
              ),
          }),
          menu.action({
            name: 'End date',
            prefix: DateTimeIcon(),
            closeOnSelect: false,
            postfix: this.postfix(
              end.status === 'ready' ? nameOf(end.propertyId, 'Date') : 'None'
            ),
            select: () =>
              navigateToSubPage('End date', () =>
                this.propertyPicker(
                  view.dateProperties$.value,
                  end.propertyId,
                  id => {
                    view.setEndDateColumn(id);
                    goBack();
                  },
                  {
                    includeNone: true,
                    create: () => {
                      view.createDateColumn('end');
                      goBack();
                    },
                  }
                )
              ),
          }),
          menu.action({
            name: 'Color bars by',
            closeOnSelect: false,
            postfix: this.postfix(nameOf(view.colorPropertyId$.value, 'None')),
            select: () =>
              navigateToSubPage('Color bars by', () =>
                this.propertyPicker(
                  view.colorProperties$.value,
                  view.colorPropertyId$.value,
                  id => {
                    view.setColorProperty(id);
                    goBack();
                  },
                  { includeNone: true }
                )
              ),
          }),
          menu.action({
            name: 'Show on bars',
            closeOnSelect: false,
            postfix: this.postfix(
              `${view.barPropertyIds$.value.length || 'None'}`
            ),
            select: () =>
              navigateToSubPage('Show on bars', () =>
                view.propertiesRaw$.value
                  .filter(p => p.type$.value !== 'title')
                  .map(property =>
                    menu.action({
                      name: property.name$.value || 'Untitled',
                      isSelected: view.barPropertyIds$.value.includes(
                        property.id
                      ),
                      closeOnSelect: false,
                      select: () => view.toggleBarProperty(property.id),
                    })
                  )
              ),
          }),
          menu.action({
            name: view.showTable$.value ? 'Hide table' : 'Show table',
            prefix: DatabaseTableViewIcon(),
            closeOnSelect: false,
            select: () => view.setShowTable(!view.showTable$.value),
          }),
        ],
      }),
    ];
  }
}

export class TimelineViewUI extends DataViewUIBase<TimelineViewUILogic> {
  static override styles = timelineViewStyles;

  private scroller?: HTMLElement;

  private tableWidthPreview$ = signal<number | undefined>(undefined);

  private range?: TimelineRange;

  override connectedCallback(): void {
    super.connectedCallback();
    this.logic.attach(this);
    this.dataset['testid'] = 'dv-timeline-view';
  }

  override disconnectedCallback(): void {
    this.logic.detach(this);
    super.disconnectedCallback();
  }

  private get tableWidth() {
    if (!this.logic.view.showTable$.value) return 0;
    return this.tableWidthPreview$.value ?? this.logic.view.tableWidth$.value;
  }

  previewTableWidth(width: number | undefined) {
    this.tableWidthPreview$.value = width;
  }

  /** Day at the centre of the visible timeline area. */
  centerDay(): number | undefined {
    const range = this.range;
    if (!this.scroller || !range) return;
    const visible = this.scroller.clientWidth - this.tableWidth;
    return dayFromOffset(
      this.scroller.scrollLeft + visible / 2,
      range,
      this.logic.view.zoom$.value
    );
  }

  scrollToDay(day: number, behavior: ScrollBehavior = 'auto') {
    const range = this.range;
    if (!this.scroller || !range) return;
    const visible = this.scroller.clientWidth - this.tableWidth;
    const x = offsetFromDay(day, range, this.logic.view.zoom$.value);
    this.scroller.scrollTo({ left: Math.max(0, x - visible / 2), behavior });
  }

  scrollByPage(direction: -1 | 1) {
    if (!this.scroller) return;
    const visible = this.scroller.clientWidth - this.tableWidth;
    this.scroller.scrollBy({
      left: direction * visible * 0.7,
      behavior: 'smooth',
    });
  }

  override updated() {
    const day = this.logic.pendingScrollDay;
    if (day !== undefined && this.scroller && this.range) {
      this.logic.pendingScrollDay = undefined;
      this.scrollToDay(day);
    }
  }

  private onWheel = (event: WheelEvent) => {
    // Keep horizontal scrolling inside the timeline instead of the page.
    const scroller = event.currentTarget as HTMLElement;
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
      if (scroller.scrollWidth > scroller.clientWidth) event.stopPropagation();
    }
  };

  private renderToolbar() {
    const view = this.logic.view;
    const zoom = view.zoom$.value;
    return html`<div class="timeline-toolbar">
      <div class="timeline-zoom" role="group" aria-label="Zoom">
        ${timelineZooms.map(
          z => html`<button
            class=${z.zoom === zoom ? 'active' : ''}
            @click=${() => this.logic.setZoom(z.zoom)}
          >
            ${z.name}
          </button>`
        )}
      </div>
      <div class="timeline-nav">
        <button
          class="timeline-text-button"
          @click=${() => view.setShowTable(!view.showTable$.value)}
        >
          ${DatabaseTableViewIcon()}<span
            >${view.showTable$.value ? 'Hide table' : 'Show table'}</span
          >
        </button>
        <button
          class="timeline-text-button"
          @click=${() => this.logic.goToday()}
        >
          Today
        </button>
        <button
          class="timeline-icon-button"
          aria-label="Earlier"
          @click=${() => this.logic.page(-1)}
        >
          ${ArrowLeftSmallIcon()}
        </button>
        <button
          class="timeline-icon-button"
          aria-label="Later"
          @click=${() => this.logic.page(1)}
        >
          ${ArrowRightSmallIcon()}
        </button>
      </div>
    </div>`;
  }

  private renderHeader(range: TimelineRange, width: number) {
    const view = this.logic.view;
    const header = getTimelineHeader(range, view.zoom$.value);
    const tableWidth = this.tableWidth;
    const properties = view.tableProperties$.value;
    return html`<div class="timeline-header" style="height:${HEADER_HEIGHT}px">
      ${
        tableWidth
          ? html`<div class="timeline-corner" style="width:${tableWidth}px">
              <div class="timeline-table-columns">
                ${properties.map(
                  property =>
                    html`<div
                      class="timeline-table-column"
                      style="width:${property.width$.value}px"
                    >
                      <uni-lit
                        class="timeline-column-icon"
                        .uni=${property.icon}
                      ></uni-lit>
                      <span>${property.name$.value}</span>
                    </div>`
                )}
              </div>
              <div
                class="timeline-table-resize"
                @pointerdown=${(e: PointerEvent) =>
                  this.logic.startTableResize(e)}
              ></div>
            </div>`
          : nothing
      }
      <div class="timeline-scale" style="width:${width}px">
        <div class="timeline-scale-top">
          ${header.top.map(
            tick => html`<div
              class="timeline-tick"
              style="left:${tick.left}px;width:${tick.width}px"
            >
              <span class="timeline-tick-label">${tick.label}</span>
            </div>`
          )}
        </div>
        <div class="timeline-scale-bottom">
          ${header.bottom.map(
            tick => html`<div
              class="timeline-tick ${tick.startDay === toDayIndex(Date.now()) ? 'is-today' : ''}"
              style="left:${tick.left}px;width:${tick.width}px"
            >
              <span class="timeline-tick-label">${tick.label}</span>
            </div>`
          )}
        </div>
      </div>
    </div>`;
  }

  /** Column lines, weekend shading and the today marker behind all lanes. */
  private renderGrid(range: TimelineRange, height: number) {
    const zoom = this.logic.view.zoom$.value;
    const header = getTimelineHeader(range, zoom);
    const dayWidth = timelineDayWidth[zoom];
    const today = toDayIndex(Date.now());
    const weekends: number[] = [];
    if (zoom === 'day' || zoom === 'week') {
      for (let day = range.startDay; day < range.endDay; day++) {
        if (isWeekend(day)) weekends.push(day);
      }
    }
    return html`<div
      class="timeline-grid"
      style="left:${this.tableWidth}px;top:${HEADER_HEIGHT}px;height:${height}px"
    >
      ${weekends.map(
        day => html`<div
          class="timeline-weekend"
          style="left:${offsetFromDay(day, range, zoom)}px;width:${dayWidth}px"
        ></div>`
      )}
      ${header.bottom.map(
        tick =>
          html`<div
            class="timeline-grid-line"
            style="left:${tick.left}px"
          ></div>`
      )}
      ${
        today >= range.startDay && today < range.endDay
          ? html`<div
              class="timeline-today"
              style="left:${offsetFromDay(today, range, zoom) + dayWidth / 2}px"
            ></div>`
          : nothing
      }
    </div>`;
  }

  private renderTableCells(item: TimelineItem) {
    const view = this.logic.view;
    const titleId = view.mainProperties$.value.titleColumn;
    return html`<div class="timeline-table-cells">
      ${view.tableProperties$.value.map(property => {
        const width = property.width$.value;
        if (property.id === titleId || property.type$.value === 'title') {
          return html`<div
            class="timeline-table-cell is-title"
            style="width:${width}px"
            title=${item.title}
          >
            <span class="timeline-row-title ${item.title ? '' : 'is-empty'}"
              >${item.title || 'Untitled'}</span
            >
            <span class="timeline-open-hint">Open</span>
          </div>`;
        }
        const renderer = property.renderer$.value;
        return html`<div class="timeline-table-cell" style="width:${width}px">
          ${
            renderer
              ? renderUniLit(
                  renderer.view,
                  {
                    cell: property.cellGetOrCreate(item.rowId),
                    isEditing$: signal(false),
                    selectCurrentCell: () => {},
                  },
                  { style: { display: 'block', overflow: 'hidden' } }
                )
              : nothing
          }
        </div>`;
      })}
    </div>`;
  }

  private renderBar(item: TimelineItem, range: TimelineRange) {
    const logic = this.logic;
    const zoom = logic.view.zoom$.value;
    const span = logic.displaySpan(item);
    if (!span) {
      const hover = logic.hover$.value;
      if (hover?.rowId !== item.rowId) return nothing;
      const ghost = getTimelineBar(
        { start: hover.day, end: hover.day },
        range,
        zoom
      );
      return html`<div
        class="timeline-ghost"
        style="left:${ghost.left}px;width:${Math.max(ghost.width, 24)}px"
      >
        ${PlusIcon()}
      </div>`;
    }
    const bar = getTimelineBar(span, range, zoom);
    const drag = logic.drag$.value;
    const dragging = drag?.rowId === item.rowId && drag.moved;
    const editable = !logic.readonly;
    const labelInside = bar.width >= 120;
    const style = `left:${bar.left}px;width:${bar.width}px;${
      item.color ? `--timeline-bar-color:${item.color};` : ''
    }`;
    const dates = `${dateFormatter.format(fromDayIndex(span.start))} → ${dateFormatter.format(fromDayIndex(span.end))}`;
    const label = html`<span class="timeline-bar-title"
        >${item.title || 'Untitled'}</span
      >${item.barProperties.map(
        value => html`<span class="timeline-bar-property">${value}</span>`
      )}`;
    return html`<div
        class="timeline-bar ${dragging ? 'is-dragging' : ''} ${editable ? 'is-editable' : ''}"
        style=${style}
        title=${`${item.title || 'Untitled'}\n${dates}`}
        role="button"
        tabindex="0"
        @pointerdown=${(e: PointerEvent) => logic.startDrag(item, 'move', e)}
        @keydown=${(e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            logic.openRow(item.rowId);
          }
        }}
      >
        ${
          editable
            ? html`<span
                class="timeline-bar-handle left"
                @pointerdown=${(e: PointerEvent) =>
                  logic.startDrag(item, 'start', e)}
              ></span>`
            : nothing
        }
        ${labelInside ? html`<span class="timeline-bar-label">${label}</span>` : nothing}
        ${
          editable
            ? html`<span
                class="timeline-bar-handle right"
                @pointerdown=${(e: PointerEvent) =>
                  logic.startDrag(item, 'end', e)}
              ></span>`
            : nothing
        }
      </div>
      ${
        labelInside
          ? nothing
          : html`<span
              class="timeline-bar-label outside"
              style="left:${bar.left + bar.width + 6}px"
              >${label}</span
            >`
      }`;
  }

  private renderLane(lane: Lane, range: TimelineRange, width: number) {
    const tableWidth = this.tableWidth;
    const logic = this.logic;
    if (lane.type === 'group') {
      const collapsed = logic.collapsedGroups$.value.has(lane.key);
      return html`<div class="timeline-row timeline-group-row">
        <button
          class="timeline-group-label"
          @click=${() => logic.toggleGroup(lane.key)}
        >
          <span class="timeline-group-toggle ${collapsed ? 'collapsed' : ''}"
            >${ArrowDownSmallIcon()}</span
          >
          <span class="timeline-group-name">${lane.name}</span>
          <span class="timeline-group-count">${lane.count}</span>
        </button>
      </div>`;
    }
    if (lane.type === 'add') {
      return html`<div class="timeline-row timeline-add-row">
        <button
          class="timeline-add-button"
          style="position:sticky;left:0"
          @click=${() => logic.newRow(lane.groupKey)}
        >
          ${PlusIcon()}<span>New</span>
        </button>
      </div>`;
    }
    const item = lane.item;
    return html`<div class="timeline-row" data-row-id=${item.rowId}>
      ${
        tableWidth
          ? html`<div
              class="timeline-table-pane"
              style="width:${tableWidth}px"
              @click=${() => logic.openRow(item.rowId)}
            >
              ${this.renderTableCells(item)}
            </div>`
          : nothing
      }
      <div
        class="timeline-lane ${item.span || logic.readonly ? '' : 'is-undated'}"
        style="width:${width}px"
        @mousemove=${(e: MouseEvent) => logic.hoverLane(item, e, range)}
        @mouseleave=${() => logic.leaveLane()}
        @click=${(e: MouseEvent) => logic.clickLane(item, e, range)}
      >
        ${this.renderBar(item, range)}
      </div>
    </div>`;
  }

  private renderTimeline() {
    const range = this.logic.range();
    this.range = range;
    const zoom = this.logic.view.zoom$.value;
    const width = getTimelineWidth(range, zoom);
    const lanes = this.logic.lanes();
    const height = lanes.length * ROW_HEIGHT;
    return html`<div
      class="timeline-scroll"
      @wheel=${this.onWheel}
      ${refTo(el => (this.scroller = el))}
    >
      <div
        class="timeline-canvas"
        style="width:${this.tableWidth + width}px;--timeline-row-height:${ROW_HEIGHT}px"
      >
        ${this.renderHeader(range, width)} ${this.renderGrid(range, height)}
        ${repeat(
          lanes,
          lane =>
            lane.type === 'row'
              ? `row:${lane.groupKey ?? ''}:${lane.item.rowId}`
              : `${lane.type}:${lane.groupKey ?? (lane.type === 'group' ? lane.key : '')}`,
          lane => this.renderLane(lane, range, width)
        )}
      </div>
    </div>`;
  }

  override render(): TemplateResult {
    const view = this.logic.view;
    const setup = view.startDateMapping$.value.status === 'setup';
    return html`
      ${
        this.logic.headerWidget
          ? renderUniLit(this.logic.headerWidget, { dataViewLogic: this.logic })
          : nothing
      }
      ${this.renderToolbar()}
      ${
        setup
          ? html`<div class="timeline-setup">
              <button
                @click=${(e: MouseEvent) =>
                  this.logic.openSetupMenu(e.currentTarget as HTMLElement)}
              >
                ${TodayIcon()}<span>Select or create a date property</span>
              </button>
            </div>`
          : this.renderTimeline()
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'affine-data-view-timeline': TimelineViewUI;
  }
}
