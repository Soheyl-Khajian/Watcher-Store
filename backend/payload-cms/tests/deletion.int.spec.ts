import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestPayload, type TestPayload } from './helpers/test-payload';

// Post thumbnails and product gallery images are required, so deleting an
// image still used there must be refused with a clear message. Writers, on
// the other hand, can always be deleted; their posts keep the byline.
describe('Deleting writers and images', () => {
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

  // Writers come and go; their posts keep the byline they were published
  // with. Deleting a writer only clears the link to the account.
  describe('writers', () => {
    const getPost = (id: number) =>
      t.payload.findByID({ collection: 'posts', id, depth: 0 });

    it('deletes a writer who has posts and keeps their byline', async () => {
      const author = await createAuthor();
      const image = await t.uploadImage(token);
      const first = await createPost(author.id, image);
      const second = await createPost(author.id, image);

      const response = await t.api('DELETE', `/users/${author.id}`, { token });

      expect(response.status).toBe(200);
      expect(await exists('users', author.id)).toBe(false);
      for (const post of [first, second]) {
        const stored = await getPost(post.id);
        expect(stored.author ?? null).toBeNull();
        expect(stored.authorName).toBe(author.displayName);
      }

      const publicPost = await t.api('GET', `/posts/${first.id}`);
      expect(publicPost.status).toBe(200);
      expect(publicPost.body.authorName).toBe(author.displayName);
    });

    it('keeps the byline when a post of a deleted writer is edited', async () => {
      const author = await createAuthor();
      const post = await createPost(author.id, await t.uploadImage(token));
      await t.api('DELETE', `/users/${author.id}`, { token });

      const response = await t.api('PATCH', `/posts/${post.id}`, {
        token,
        body: { title: 'Updated title' },
      });

      expect(response.status).toBe(200);
      expect((await getPost(post.id)).authorName).toBe(author.displayName);
    });

    it('uses the new byline when another writer is assigned', async () => {
      const author = await createAuthor();
      const successor = await createAuthor();
      const post = await createPost(author.id, await t.uploadImage(token));
      await t.api('DELETE', `/users/${author.id}`, { token });

      const response = await t.api('PATCH', `/posts/${post.id}`, {
        token,
        body: { author: successor.id },
      });

      expect(response.status).toBe(200);
      expect((await getPost(post.id)).authorName).toBe(successor.displayName);
    });

    it('still requires an author for a new post', async () => {
      counter += 1;
      const response = await t.api('POST', '/posts', {
        token,
        body: {
          title: 'No author',
          excerpt: 'Excerpt',
          slug: `no-author-${counter}`,
          status: 'draft',
          thumbnail: await t.uploadImage(token),
        },
      });

      expect(response.status).toBe(400);
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
