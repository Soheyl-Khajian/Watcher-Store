import { createTestApp, TestApp } from './e2e/harness';

describe('Cart (e2e)', () => {
  let t: TestApp;
  let token: string;

  beforeAll(async () => {
    t = await createTestApp();
    token = await t.login(await t.createUser({ email: 'cart@example.test' }));
  });

  afterAll(async () => {
    await t?.close();
  });

  const auth = (value = token) => ({ Authorization: `Bearer ${value}` });

  it('requires authentication', async () => {
    await t.http().get('/cart').expect(401);
    await t
      .http()
      .post('/cart')
      .send({ productId: 1, quantity: 1 })
      .expect(401);
  });

  it('adds, accumulates and removes items', async () => {
    const productId = await t.createProduct({ price: 500_000, stock: 5 });

    await t
      .http()
      .post('/cart')
      .set(auth())
      .send({ productId, quantity: 2 })
      .expect(201);

    const cart = await t
      .http()
      .post('/cart')
      .set(auth())
      .send({ productId, quantity: 1 })
      .expect(201);

    expect(cart.body.items).toEqual([
      expect.objectContaining({ productId: String(productId), quantity: 3 }),
    ]);

    await t
      .http()
      .get('/cart')
      .set(auth())
      .expect(200)
      .expect((res) => expect(res.body.items).toHaveLength(1));

    await t.http().delete(`/cart/${productId}`).set(auth()).expect(200);

    await t
      .http()
      .get('/cart')
      .set(auth())
      .expect(200)
      .expect((res) => expect(res.body.items).toEqual([]));
  });

  it('refuses more units than are in stock', async () => {
    const productId = await t.createProduct({ price: 100_000, stock: 2 });

    await t
      .http()
      .post('/cart')
      .set(auth())
      .send({ productId, quantity: 3 })
      .expect(409);
  });

  it('treats draft and missing products as not found', async () => {
    const draftId = await t.createProduct({ price: 100_000, status: 'draft' });

    await t
      .http()
      .post('/cart')
      .set(auth())
      .send({ productId: draftId, quantity: 1 })
      .expect(404);

    await t
      .http()
      .post('/cart')
      .set(auth())
      .send({ productId: 999_999, quantity: 1 })
      .expect(404);
  });

  it.each([
    ['a zero quantity', { productId: 1, quantity: 0 }],
    ['a fractional quantity', { productId: 1, quantity: 1.5 }],
    ['a missing product id', { quantity: 1 }],
    ['an unknown field', { productId: 1, quantity: 1, price: 1 }],
  ])('rejects %s', async (_label, body) => {
    await t.http().post('/cart').set(auth()).send(body).expect(400);
  });

  it('keeps carts separate per customer', async () => {
    const productId = await t.createProduct({ price: 100_000 });
    const other = await t.login(
      await t.createUser({ email: 'cart-other@example.test' }),
    );

    await t
      .http()
      .post('/cart')
      .set(auth(other))
      .send({ productId, quantity: 1 })
      .expect(201);

    const mine = await t.http().get('/cart').set(auth()).expect(200);
    expect(mine.body.items).not.toContainEqual(
      expect.objectContaining({ productId: String(productId) }),
    );
  });

  describe('changing a quantity', () => {
    const setQuantity = (productId: number, quantity: unknown) =>
      t.http().patch(`/cart/${productId}`).set(auth()).send({ quantity });

    it('sets the quantity of a cart line', async () => {
      const productId = await t.createProduct({ price: 100_000, stock: 5 });
      await t
        .http()
        .post('/cart')
        .set(auth())
        .send({ productId, quantity: 1 })
        .expect(201);

      const cart = await setQuantity(productId, 4).expect(200);

      expect(cart.body.items).toContainEqual(
        expect.objectContaining({ productId: String(productId), quantity: 4 }),
      );
    });

    it('refuses more than is in stock', async () => {
      const productId = await t.createProduct({ price: 100_000, stock: 3 });
      await t
        .http()
        .post('/cart')
        .set(auth())
        .send({ productId, quantity: 1 })
        .expect(201);

      await setQuantity(productId, 4).expect(409);
    });

    it.each([0, -1, 1.5, 'two'])(
      'rejects the quantity %p',
      async (quantity) => {
        const productId = await t.createProduct({ price: 100_000 });
        await t
          .http()
          .post('/cart')
          .set(auth())
          .send({ productId, quantity: 1 })
          .expect(201);

        await setQuantity(productId, quantity).expect(400);
      },
    );

    it('answers 404 for a product that is not in the cart', async () => {
      const productId = await t.createProduct({ price: 100_000 });
      await setQuantity(productId, 1).expect(404);
    });

    it('is allowed by CORS for the storefront', async () => {
      const response = await t
        .http()
        .options('/cart/1')
        .set('Origin', 'http://localhost:3002')
        .set('Access-Control-Request-Method', 'PATCH');

      expect(
        String(response.headers['access-control-allow-methods']),
      ).toContain('PATCH');
    });
  });
});
