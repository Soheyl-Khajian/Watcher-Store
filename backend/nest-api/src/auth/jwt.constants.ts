// backend/nest-api/src/auth/jwt.constants.ts
//
// Storefront login tokens are signed and verified with exactly these values.
// A token with the right signature but another algorithm, issuer or
// audience (for example one minted for a different service that shares the
// secret by mistake) is rejected.

export const JWT_ALGORITHM = 'HS256';
export const JWT_ISSUER = 'watcher-store-api';
export const JWT_AUDIENCE = 'watcher-store-storefront';
