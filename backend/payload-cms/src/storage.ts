// backend/payload-cms/src/storage.ts
//
// Where uploaded media is stored. Without S3_BUCKET, on local disk (the
// media/ folder; a named volume in docker-compose.prod.yml, so uploads
// survive a redeploy). With it, in that S3-compatible bucket.
//
// Either way files are served through Payload (/api/media/file/...), with
// the Media collection's access rules, so URLs do not change when the
// storage does and the bucket can stay private.

import { s3Storage } from '@payloadcms/storage-s3';
import type { Plugin } from 'payload';
import type { Env } from './env';

type StorageEnv = Pick<
  Env,
  | 'S3_BUCKET'
  | 'S3_REGION'
  | 'S3_ENDPOINT'
  | 'S3_ACCESS_KEY_ID'
  | 'S3_SECRET_ACCESS_KEY'
  | 'S3_FORCE_PATH_STYLE'
>;

// The plugin is always registered, and switched on by S3_BUCKET. Its fields
// (the object key and prefix of each file) are always on the Media
// collection, so the database schema is the same with or without a bucket
// and one can be added later without a migration; and its admin component
// is always in the import map.
export function mediaStoragePlugins(env: StorageEnv): Plugin[] {
  return [
    s3Storage({
      enabled: Boolean(env.S3_BUCKET),
      alwaysInsertFields: true,
      collections: { media: true },
      bucket: env.S3_BUCKET ?? '',
      config: {
        region: env.S3_REGION,
        ...(env.S3_ENDPOINT ? { endpoint: env.S3_ENDPOINT } : {}),
        forcePathStyle: env.S3_FORCE_PATH_STYLE,
        ...(env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY
          ? {
              credentials: {
                accessKeyId: env.S3_ACCESS_KEY_ID,
                secretAccessKey: env.S3_SECRET_ACCESS_KEY,
              },
            }
          : {}),
      },
    }),
  ];
}
