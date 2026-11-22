import { describe, expect, it } from 'vitest';
import { clientAddress } from './bff';

describe('clientAddress', () => {
  it('takes the address the one trusted proxy saw', () => {
    expect(clientAddress('203.0.113.9', 1)).toBe('203.0.113.9');
  });

  it('ignores entries the client wrote before the proxies', () => {
    expect(clientAddress('10.0.0.1, 1.2.3.4, 203.0.113.9', 1)).toBe(
      '203.0.113.9',
    );
    // Two proxies: the outer one's view comes second from the end.
    expect(clientAddress('1.2.3.4, 203.0.113.9, 172.18.0.5', 2)).toBe(
      '203.0.113.9',
    );
  });

  it('accepts IPv6 addresses', () => {
    expect(clientAddress('2001:db8::7', 1)).toBe('2001:db8::7');
  });

  it('trusts nothing without a proxy (a client could write any address)', () => {
    expect(clientAddress('203.0.113.9', 0)).toBeNull();
  });

  it.each([
    [null, 1],
    ['', 1],
    // Fewer entries than proxies: not what the proxies would send.
    ['203.0.113.9', 2],
    // Not an address.
    ['not-an-ip', 1],
    ['203.0.113.9, unknown', 1],
  ])('gives nothing for %j with %i proxies', (header, hops) => {
    expect(clientAddress(header, hops)).toBeNull();
  });
});
