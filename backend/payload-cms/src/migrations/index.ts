import * as migration_20250729_162018_InitialSchemaWithLatestVersion from './20250729_162018_InitialSchemaWithLatestVersion';
import * as migration_20250730_175238_CreatePostsCollection from './20250730_175238_CreatePostsCollection';
import * as migration_20250801_132030_AddExcerptToPosts from './20250801_132030_AddExcerptToPosts';
import * as migration_20250802_222803_CreateFooterGlobal from './20250802_222803_CreateFooterGlobal';
import * as migration_20250802_231755_AddDetailsToProducts from './20250802_231755_AddDetailsToProducts';
import * as migration_20250803_083715_CreatePagesCollection from './20250803_083715_CreatePagesCollection';
import * as migration_20250803_105114_AddPriceAdjustmentToCategories from './20250803_105114_AddPriceAdjustmentToCategories';
import * as migration_20250803_164009_AddSalePriceToProducts from './20250803_164009_AddSalePriceToProducts';
import * as migration_20250809_155914_AddIconToCategories from './20250809_155914_AddIconToCategories';

export const migrations = [
  {
    up: migration_20250729_162018_InitialSchemaWithLatestVersion.up,
    down: migration_20250729_162018_InitialSchemaWithLatestVersion.down,
    name: '20250729_162018_InitialSchemaWithLatestVersion',
  },
  {
    up: migration_20250730_175238_CreatePostsCollection.up,
    down: migration_20250730_175238_CreatePostsCollection.down,
    name: '20250730_175238_CreatePostsCollection',
  },
  {
    up: migration_20250801_132030_AddExcerptToPosts.up,
    down: migration_20250801_132030_AddExcerptToPosts.down,
    name: '20250801_132030_AddExcerptToPosts',
  },
  {
    up: migration_20250802_222803_CreateFooterGlobal.up,
    down: migration_20250802_222803_CreateFooterGlobal.down,
    name: '20250802_222803_CreateFooterGlobal',
  },
  {
    up: migration_20250802_231755_AddDetailsToProducts.up,
    down: migration_20250802_231755_AddDetailsToProducts.down,
    name: '20250802_231755_AddDetailsToProducts',
  },
  {
    up: migration_20250803_083715_CreatePagesCollection.up,
    down: migration_20250803_083715_CreatePagesCollection.down,
    name: '20250803_083715_CreatePagesCollection',
  },
  {
    up: migration_20250803_105114_AddPriceAdjustmentToCategories.up,
    down: migration_20250803_105114_AddPriceAdjustmentToCategories.down,
    name: '20250803_105114_AddPriceAdjustmentToCategories',
  },
  {
    up: migration_20250803_164009_AddSalePriceToProducts.up,
    down: migration_20250803_164009_AddSalePriceToProducts.down,
    name: '20250803_164009_AddSalePriceToProducts',
  },
  {
    up: migration_20250809_155914_AddIconToCategories.up,
    down: migration_20250809_155914_AddIconToCategories.down,
    name: '20250809_155914_AddIconToCategories'
  },
];
