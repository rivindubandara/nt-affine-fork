import { calendarEffects } from './calendar/effect.js';
import { kanbanEffects } from './kanban/effect.js';
import { tableEffects } from './table/effect.js';
import { timelineEffects } from './timeline/effect.js';

export function viewPresetsEffects() {
  calendarEffects();
  kanbanEffects();
  tableEffects();
  timelineEffects();
}
