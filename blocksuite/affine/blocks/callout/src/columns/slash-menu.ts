import { focusBlockEnd } from '@blocksuite/affine-shared/commands';
import { isInsideBlockByFlavour } from '@blocksuite/affine-shared/utils';
import {
  type SlashMenuActionItem,
  type SlashMenuConfig,
} from '@blocksuite/affine-widget-slash-menu';
import { LayoutIcon } from '@blocksuite/icons/lit';

const columnsItem = (count: number, order: number): SlashMenuActionItem => ({
  name: `${count} Columns`,
  description: `Lay out content in ${count} side-by-side columns.`,
  icon: LayoutIcon(),
  searchAlias: ['columns', 'layout', `${count} columns`],
  group: `0_Basic@${10 + order}`,
  // Columns live directly in a note: not inside another column, callout, etc.
  when: ({ model }) =>
    model.store.getParent(model)?.flavour === 'affine:note' &&
    !isInsideBlockByFlavour(model.store, model, 'affine:edgeless-text'),
  action: ({ model, std }) => {
    const { store } = model;
    const parent = store.getParent(model);
    if (!parent) return;
    const index = parent.children.indexOf(model);
    if (index === -1) return;
    const columnsId = store.addBlock('affine:columns', {}, parent, index + 1);
    let firstParagraph: string | undefined;
    for (let i = 0; i < count; i++) {
      const columnId = store.addBlock('affine:column', { ratio: 1 }, columnsId);
      const paragraphId = store.addBlock('affine:paragraph', {}, columnId);
      firstParagraph ??= paragraphId;
    }
    if (!firstParagraph) return;
    const focusId = firstParagraph;
    std.host.updateComplete
      .then(() => {
        const paragraph = std.view.getBlock(focusId);
        if (!paragraph) return;
        std.command.exec(focusBlockEnd, { focusBlock: paragraph });
      })
      .catch(console.error);
  },
});

export const columnsSlashMenuConfig: SlashMenuConfig = {
  items: [columnsItem(2, 0), columnsItem(3, 1), columnsItem(4, 2)],
};
