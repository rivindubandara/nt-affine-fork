import type {
  ColumnBlockModel,
  ColumnsBlockModel,
} from '@blocksuite/affine-model';
import { focusTextModel } from '@blocksuite/affine-rich-text';
import { EDGELESS_TOP_CONTENTEDITABLE_SELECTOR } from '@blocksuite/affine-shared/consts';
import { DocModeProvider } from '@blocksuite/affine-shared/services';
import { BlockComponent } from '@blocksuite/std';
import { css, html, nothing } from 'lit';

/** Smallest share of a pair of columns that a drag can shrink one to. */
const MIN_PAIR_SHARE = 0.1;

const topContenteditable = (block: BlockComponent) => {
  if (block.std.get(DocModeProvider).getEditorMode() === 'edgeless') {
    return block.closest<BlockComponent>(EDGELESS_TOP_CONTENTEDITABLE_SELECTOR);
  }
  return block.rootComponent;
};

/**
 * Row of side-by-side columns. Each child `affine:column` is a flex item whose
 * grow factor is its `ratio`, so widths follow the stored proportions.
 */
export class ColumnsBlockComponent extends BlockComponent<ColumnsBlockModel> {
  static override styles = css`
    affine-columns {
      display: flex;
      align-items: flex-start;
      gap: 32px;
      margin: 8px 0;
    }

    @media (max-width: 640px) {
      affine-columns {
        flex-direction: column;
        gap: 8px;
      }
      affine-columns > affine-column {
        width: 100%;
      }
      affine-columns .affine-column-resizer {
        display: none;
      }
    }
  `;

  override get topContenteditableElement() {
    return topContenteditable(this);
  }

  override renderBlock() {
    return html`${this.renderChildren(this.model)}`;
  }
}

export class ColumnBlockComponent extends BlockComponent<ColumnBlockModel> {
  static override styles = css`
    affine-column {
      position: relative;
      display: block;
      min-width: 0;
      box-sizing: border-box;
    }

    affine-column .affine-column-empty {
      min-height: 32px;
      cursor: text;
    }

    affine-column .affine-column-resizer {
      position: absolute;
      top: 0;
      bottom: 0;
      right: -20px;
      width: 8px;
      cursor: col-resize;
      z-index: 1;
    }

    affine-column .affine-column-resizer::after {
      content: '';
      position: absolute;
      top: 0;
      bottom: 0;
      left: 3px;
      width: 2px;
      border-radius: 1px;
      background: var(--affine-primary-color);
      opacity: 0;
      transition: opacity 0.15s;
    }

    affine-column .affine-column-resizer:hover::after,
    affine-column .affine-column-resizer.dragging::after {
      opacity: 0.6;
    }
  `;

  override get topContenteditableElement() {
    return topContenteditable(this);
  }

  private get nextColumn(): ColumnBlockModel | null {
    const parent = this.model.parent;
    if (!parent) return null;
    const index = parent.children.indexOf(this.model);
    return (parent.children[index + 1] as ColumnBlockModel | undefined) ?? null;
  }

  private readonly addFirstParagraph = (event: MouseEvent) => {
    if (this.store.readonly || this.model.children.length > 0) return;
    event.stopPropagation();
    const id = this.store.addBlock('affine:paragraph', {}, this.model);
    focusTextModel(this.std, id);
  };

  /** Drag the divider on this column's right edge to trade width with the next column. */
  private readonly startResize = (event: PointerEvent) => {
    const next = this.nextColumn;
    const nextElement = next ? this.std.view.getBlock(next.id) : null;
    if (!next || !nextElement || this.store.readonly) return;
    event.preventDefault();
    event.stopPropagation();

    const handle = event.currentTarget as HTMLElement;
    handle.classList.add('dragging');
    const startX = event.clientX;
    const leftWidth = this.getBoundingClientRect().width;
    const rightWidth = nextElement.getBoundingClientRect().width;
    const pairWidth = leftWidth + rightWidth;
    const pairRatio = this.model.props.ratio + next.props.ratio;
    let leftRatio = this.model.props.ratio;

    const onMove = (e: PointerEvent) => {
      const share = Math.min(
        1 - MIN_PAIR_SHARE,
        Math.max(MIN_PAIR_SHARE, (leftWidth + e.clientX - startX) / pairWidth)
      );
      leftRatio = pairRatio * share;
      // Preview without writing to the doc on every pointer move.
      this.style.flexGrow = `${leftRatio}`;
      nextElement.style.flexGrow = `${pairRatio - leftRatio}`;
    };
    const onUp = () => {
      handle.classList.remove('dragging');
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      this.store.transact(() => {
        this.store.updateBlock(this.model, { ratio: leftRatio });
        this.store.updateBlock(next, { ratio: pairRatio - leftRatio });
      });
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  };

  override renderBlock() {
    const ratio = this.model.props.ratio$.value;
    this.style.flex = `${ratio > 0 ? ratio : 1} 1 0`;
    const isEmpty = this.model.children.length === 0;
    return html`
      ${
        isEmpty
          ? html`<div
              class="affine-column-empty"
              @click=${this.addFirstParagraph}
            ></div>`
          : this.renderChildren(this.model)
      }
      ${
        this.nextColumn && !this.store.readonly
          ? html`<div
              class="affine-column-resizer"
              contenteditable="false"
              @pointerdown=${this.startResize}
            ></div>`
          : nothing
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'affine-columns': ColumnsBlockComponent;
    'affine-column': ColumnBlockComponent;
  }
}
