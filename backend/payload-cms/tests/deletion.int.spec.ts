import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestPayload, type TestPayload } from './helpers/test-payload';

// Posts require an author and a thumbnail, and product gallery rows require
// an image. Deleting something still referenced there must be refused with
// a clear message instead of failing inside the database.
describe('Deleting referenced users and images', () => {
  let t: TestPayload;
  let token: string;
  let counter = 0;

  beforeAll(async () => {
    t = await createTestPayload();
    token = (await t.createUser('deletion-admin@example.test', 'admin')).token;
  });

  afterAll(async () => {
    await t?.close();
  });

  const createAuthor = async () => {
    counter += 1;
    return t.payload.create({
      collection: 'users',
      data: {
        email: `writer-${counter}@example.test`,
        password: 'writer-password',
        role: 'admin',
        displayName: `Writer ${counter}`,
      },
    });
  };

  const createPost = async (author: number, thumbnail: number) => {
    counter += 1;
    return t.payload.create({
      collection: 'posts',
      data: {
        title: `Post ${counter}`,
        excerpt: 'Excerpt',
        slug: `post-${counter}`,
        status: 'published',
        author,
        thumbnail,
      },
    });
  };

  const exists = async (collection: 'users' | 'media', id: number) =>
    (
      await t.payload.find({
        collection,
        where: { id: { equals: id } },
        depth: 0,
      })
    ).totalDocs === 1;

  describe('users', () => {
    it('refuses to delete the author of a post, naming the posts', async () => {
      const author = await createAuthor();
      const post = await createPost(author.id, await t.uploadImage(token));

      const response = await t.api('DELETE', `/users/${author.id}`, { token });

      expect(response.status).toBe(409);
      expect(JSON.stringify(response.body)).toContain(post.title);
      expect(await exists('users', author.id)).toBe(true);
    });

    it('deletes a user who has no posts', async () => {
      const author = await createAuthor();

      const response = await t.api('DELETE', `/users/${author.id}`, { token });

      expect(response.status).toBe(200);
      expect(await exists('users', author.id)).toBe(false);
    });

    it('deletes an author once their posts are reassigned', async () => {
      const author = await createAuthor();
      const other = await createAuthor();
      const post = await createPost(author.id, await t.uploadImage(token));

      await t.payload.update({
        collection: 'posts',
        id: post.id,
        data: { author: other.id },
      });

      const response = await t.api('DELETE', `/users/${author.id}`, { token });
      expect(response.status).toBe(200);

      const reassigned = await t.payload.findByID({
        collection: 'posts',
        id: post.id,
      });
      expect(reassigned.authorName).toBe(other.displayName);
    });
  });

  describe('images', () => {
    it('refuses to delete a post thumbnail', async () => {
      const image = await t.uploadImage(token);
      await createPost((await createAuthor()).id, image);

      const response = await t.api('DELETE', `/media/${image}`, { token });

      expect(response.status).toBe(409);
      expect(await exists('media', image)).toBe(true);
    });

    it('refuses to delete an image in a product gallery', async () => {
      const image = await t.uploadImage(token);
      counter += 1;
      const product = await t.payload.create({
        collection: 'products',
        data: {
          name: 'Camera with gallery',
          sku: `GAL-${counter}`,
          slug: `camera-gallery-${counter}`,
          status: 'published',
          price: 1_000_000,
          gallery: [{ image }],
        },
      });

      const response = await t.api('DELETE', `/media/${image}`, { token });

      expect(response.status).toBe(409);
      expect(JSON.stringify(response.body)).toContain(product.name);
      expect(await exists('media', image)).toBe(true);
    });

    it('deletes an image used only as an optional category image', async () => {
      const image = await t.uploadImage(token);
      counter += 1;
      const category = await t.payload.create({
        collection: 'categories',
        data: { name: 'With image', slug: `with-image-${counter}`, image },
      });

      const response = await t.api('DELETE', `/media/${image}`, { token });

      expect(response.status).toBe(200);
      const updated = await t.payload.findByID({
        collection: 'categories',
        id: category.id,
        depth: 0,
      });
      expect(updated.image ?? null).toBeNull();
    });

    it('deletes an unused image', async () => {
      const image = await t.uploadImage(token);

      const response = await t.api('DELETE', `/media/${image}`, { token });

      expect(response.status).toBe(200);
      expect(await exists('media', image)).toBe(false);
    });
  });
});
