import type { GroupBy, GroupProperty } from '../../core/common/types.js';
import type { FilterGroup } from '../../core/filter/types.js';
import type { Sort } from '../../core/sort/types.js';
import { type BasicViewDataType, viewType } from '../../core/view/data-view.js';
import type { TableViewColumn } from '../table/define.js';
import type { TimelineZoom } from './layout.js';
import { TimelineSingleView } from './timeline-view-manager.js';

export const timelineViewType = viewType('timeline');

type DataType = {
  // Shares the table view's shape so filter / sort / group / property
  // visibility behave exactly like the table view.
  columns: TableViewColumn[];
  filter: FilterGroup;
  groupBy?: GroupBy;
  groupProperties?: GroupProperty[];
  sort?: Sort;
  header?: {
    titleColumn?: string;
    iconColumn?: string;
    imageColumn?: string;
  };
  date: {
    startColumnId?: string;
    endColumnId?: string;
  };
  timeline: {
    zoom: TimelineZoom;
    showTable: boolean;
    tableWidth?: number;
    colorColumnId?: string;
    barPropertyIds?: string[];
  };
};

export type TimelineViewData = BasicViewDataType<
  typeof timelineViewType.type,
  DataType
>;

export const timelineViewModel = timelineViewType.createModel<TimelineViewData>(
  {
    defaultName: 'Timeline View',
    dataViewManager: TimelineSingleView,
    defaultData: viewManager => {
      const dataSource = viewManager.dataSource;
      const properties = dataSource.properties$.value;
      const titleColumn = properties.find(
        id => dataSource.propertyTypeGet(id) === 'title'
      );
      const dateColumns = properties.filter(
        id => dataSource.propertyTypeGet(id) === 'date'
      );
      return {
        columns: properties.map(id => ({
          id,
          width: id === titleColumn ? 260 : 160,
          hide: id !== titleColumn,
        })),
        filter: {
          type: 'group',
          op: 'and',
          conditions: [],
        },
        header: {
          titleColumn,
          iconColumn: 'type',
        },
        date: {
          startColumnId: dateColumns[0],
          endColumnId: dateColumns[1],
        },
        timeline: {
          zoom: 'month',
          showTable: true,
        },
      };
    },
  }
);
