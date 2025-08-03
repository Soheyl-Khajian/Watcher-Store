import * as migration_20250729_162018_InitialSchemaWithLatestVersion from './20250729_162018_InitialSchemaWithLatestVersion';
import * as migration_20250730_175238_CreatePostsCollection from './20250730_175238_CreatePostsCollection';
import * as migration_20250801_132030_AddExcerptToPosts from './20250801_132030_AddExcerptToPosts';
import * as migration_20250802_222803_CreateFooterGlobal from './20250802_222803_CreateFooterGlobal';
import * as migration_20250802_231755_AddDetailsToProducts from './20250802_231755_AddDetailsToProducts';

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
    name: '20250802_231755_AddDetailsToProducts'
  },
];
