import { storefrontRole } from './jwt.strategy';

describe('storefrontRole', () => {
  it('keeps administrators administrators', () => {
    expect(storefrontRole('admin')).toBe('admin');
  });

  it.each(['customer', 'editor', 'writer', '', null, undefined, 42])(
    'treats %p as a customer',
    (role) => {
      expect(storefrontRole(role)).toBe('customer');
    },
  );
});
