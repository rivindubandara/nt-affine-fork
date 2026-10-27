import { TimelineViewUI } from './view.js';

export function pcEffects() {
  if (customElements.get('affine-data-view-timeline')) {
    return;
  }
  customElements.define('affine-data-view-timeline', TimelineViewUI);
}
