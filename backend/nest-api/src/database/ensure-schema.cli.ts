// backend/nest-api/src/database/ensure-schema.cli.ts
import { ensureSchema } from './ensure-schema';

ensureSchema()
  .then(() => process.exit(0))
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  });