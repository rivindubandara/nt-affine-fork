import { CalloutBlockComponent } from './callout-block';
import {
  ColumnBlockComponent,
  ColumnsBlockComponent,
} from './columns/columns-block';
import { IconPickerWrapper } from './icon-picker-wrapper';

export function effects() {
  customElements.define('affine-callout', CalloutBlockComponent);
  customElements.define('icon-picker-wrapper', IconPickerWrapper);
  customElements.define('affine-columns', ColumnsBlockComponent);
  customElements.define('affine-column', ColumnBlockComponent);
}

declare global {
  interface HTMLElementTagNameMap {
    'affine-callout': CalloutBlockComponent;
    'icon-picker-wrapper': IconPickerWrapper;
  }
}
