import { createIcon } from '../../core/utils/uni-icon.js';
import type { DataViewUILogicBaseConstructor } from '../../core/view/data-view-base.js';
import { timelineViewModel } from './define.js';
import { TimelineViewUILogic } from './pc/view.js';

export const timelineViewMeta = timelineViewModel.createMeta({
  icon: createIcon('DateTimeIcon'),
  pcLogic: () =>
    TimelineViewUILogic as unknown as DataViewUILogicBaseConstructor,
});
