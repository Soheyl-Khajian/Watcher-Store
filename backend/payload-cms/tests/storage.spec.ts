import type { CollectionConfig, Config } from 'payload';
import { describe, expect, it } from 'vitest';
import { mediaStoragePlugins } from '../src/storage';

// Applies the storage plugins to a minimal config with a Media collection
// and returns that collection as Payload will see it.
async function mediaWith(env: Parameters<typeof mediaStoragePlugins>[0]) {
  const media: CollectionConfig = {
    slug: 'media',
    upload: { staticDir: 'media' },
    fields: [{ name: 'alt', type: 'text' }],
  };
  let config = { collections: [media] } as Config;
  for (const plugin of mediaStoragePlugins(env)) {
    config = await plugin(config);
  }
  return config.collections!.find((c) => c.slug === 'media')!;
}

const fieldNames = (collection: CollectionConfig) =>
  collection.fields.map((field) => ('name' in field ? field.name : ''));

const noBucket = { S3_FORCE_PATH_STYLE: false };
const bucket = {
  S3_BUCKET: 'watcher-media',
  S3_REGION: 'us-east-1',
  S3_ENDPOINT: 'http://minio:9000',
  S3_ACCESS_KEY_ID: 'key',
  S3_SECRET_ACCESS_KEY: 'secret',
  S3_FORCE_PATH_STYLE: true,
};

describe('media storage', () => {
  it('keeps uploads on local disk without a bucket', async () => {
    const media = await mediaWith(noBucket);
    const upload = media.upload as { disableLocalStorage?: boolean };
    expect(upload.disableLocalStorage).not.toBe(true);
  });

  it('stores uploads in the bucket when one is set', async () => {
    const media = await mediaWith(bucket);
    const upload = media.upload as { disableLocalStorage?: boolean };
    expect(upload.disableLocalStorage).toBe(true);
    expect(media.hooks?.afterDelete?.length).toBeGreaterThan(0);
  });

  // Same database columns either way, so a bucket can be added later
  // without a migration (see migrations/*_media_storage_fields).
  it('gives Media the same stored fields with or without a bucket', async () => {
    const without = fieldNames(await mediaWith(noBucket));
    const withBucket = fieldNames(await mediaWith(bucket));
    expect(without).toEqual(expect.arrayContaining(['prefix', '_objectKey']));
    expect(new Set(without)).toEqual(new Set(withBucket));
  });
});
