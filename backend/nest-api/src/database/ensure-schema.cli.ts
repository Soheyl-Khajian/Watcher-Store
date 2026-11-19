// backend/nest-api/src/database/ensure-schema.cli.ts
import { ensureSchema } from './ensure-schema';

ensureSchema()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
