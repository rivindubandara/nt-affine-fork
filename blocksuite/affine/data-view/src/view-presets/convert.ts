import { createViewConvert } from '../core/view/convert.js';
import { calendarViewModel } from './calendar/index.js';
import { kanbanViewModel } from './kanban/index.js';
import { tableViewModel } from './table/index.js';
import { timelineViewModel } from './timeline/index.js';

const headerToCalendarCard = (header?: { titleColumn?: string }) => ({
  titleColumnId: header?.titleColumn,
  visiblePropertyIds: [],
});

const calendarCardToHeader = (card?: { titleColumnId?: string }) => ({
  titleColumn: card?.titleColumnId,
});

const calendarDateToTimeline = (date?: {
  startColumnId?: string;
  endColumnId?: string;
}) => ({
  startColumnId: date?.startColumnId,
  endColumnId: date?.endColumnId,
});

export const viewConverts = [
  createViewConvert(tableViewModel, kanbanViewModel, data => ({
    filter: data.filter,
    header: data.header,
  })),
  createViewConvert(kanbanViewModel, tableViewModel, data => ({
    filter: data.filter,
    header: data.header,
    groupBy: data.groupBy,
  })),
  createViewConvert(tableViewModel, calendarViewModel, data => ({
    filter: data.filter,
    sort: data.sort,
    card: headerToCalendarCard(data.header),
  })),
  createViewConvert(kanbanViewModel, calendarViewModel, data => ({
    filter: data.filter,
    sort: data.sort,
    card: headerToCalendarCard(data.header),
  })),
  createViewConvert(calendarViewModel, tableViewModel, data => ({
    filter: data.filter,
    sort: data.sort,
    header: calendarCardToHeader(data.card),
  })),
  createViewConvert(calendarViewModel, kanbanViewModel, data => ({
    filter: data.filter,
    sort: data.sort,
    header: calendarCardToHeader(data.card),
  })),
  createViewConvert(tableViewModel, timelineViewModel, data => ({
    filter: data.filter,
    sort: data.sort,
    header: data.header,
    groupBy: data.groupBy,
    groupProperties: data.groupProperties,
  })),
  createViewConvert(kanbanViewModel, timelineViewModel, data => ({
    filter: data.filter,
    sort: data.sort,
    header: data.header,
    groupBy: data.groupBy,
    groupProperties: data.groupProperties,
  })),
  createViewConvert(calendarViewModel, timelineViewModel, data => ({
    filter: data.filter,
    sort: data.sort,
    header: calendarCardToHeader(data.card),
    ...(data.date?.startColumnId
      ? { date: calendarDateToTimeline(data.date) }
      : {}),
  })),
  createViewConvert(timelineViewModel, tableViewModel, data => ({
    filter: data.filter,
    sort: data.sort,
    header: data.header,
    groupBy: data.groupBy,
    groupProperties: data.groupProperties,
  })),
  createViewConvert(timelineViewModel, kanbanViewModel, data => ({
    filter: data.filter,
    sort: data.sort,
    header: data.header,
    groupBy: data.groupBy,
  })),
  createViewConvert(timelineViewModel, calendarViewModel, data => ({
    filter: data.filter,
    sort: data.sort,
    card: headerToCalendarCard(data.header),
    ...(data.date?.startColumnId
      ? { date: calendarDateToTimeline(data.date) }
      : {}),
  })),
];
