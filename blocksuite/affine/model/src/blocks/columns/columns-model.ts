import {
  BlockModel,
  BlockSchemaExtension,
  defineBlockSchema,
} from '@blocksuite/store';

import type { BlockMeta } from '../../utils/types';

/**
 * A row of side-by-side columns (Notion's "column list").
 * Children are `affine:column` blocks laid out horizontally.
 */
export type ColumnsProps = BlockMeta;

export const ColumnsBlockSchema = defineBlockSchema({
  flavour: 'affine:columns',
  props: (): ColumnsProps => ({
    'meta:createdAt': undefined,
    'meta:updatedAt': undefined,
    'meta:createdBy': undefined,
    'meta:updatedBy': undefined,
  }),
  metadata: {
    version: 1,
    role: 'hub',
    parent: ['affine:note'],
    children: ['affine:column'],
  },
  toModel: () => new ColumnsBlockModel(),
});

export class ColumnsBlockModel extends BlockModel<ColumnsProps> {}

export const ColumnsBlockSchemaExtension =
  BlockSchemaExtension(ColumnsBlockSchema);

export type ColumnProps = {
  /** Relative width; columns in a row share space in proportion to it. */
  ratio: number;
} & BlockMeta;

export const ColumnBlockSchema = defineBlockSchema({
  flavour: 'affine:column',
  props: (): ColumnProps => ({
    ratio: 1,
    'meta:createdAt': undefined,
    'meta:updatedAt': undefined,
    'meta:createdBy': undefined,
    'meta:updatedBy': undefined,
  }),
  metadata: {
    version: 1,
    role: 'hub',
    parent: ['affine:columns'],
    children: ['@content', 'affine:database', 'affine:callout'],
  },
  toModel: () => new ColumnBlockModel(),
});

export class ColumnBlockModel extends BlockModel<ColumnProps> {}

export const ColumnBlockSchemaExtension =
  BlockSchemaExtension(ColumnBlockSchema);
