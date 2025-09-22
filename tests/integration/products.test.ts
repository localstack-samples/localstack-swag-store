import { listProducts } from './lib/test-utils';

describe('Product Catalog', () => {
  test('lists non-empty products array', async () => {
    const products = await listProducts();
    expect(Array.isArray(products)).toBe(true);
    expect(products.length).toBeGreaterThan(0);
  });

  test('contains seeded product LocalStack Socks', async () => {
    const products = await listProducts();
    const names = products.map((p: any) => p.name);
    expect(names).toContain('LocalStack Socks');
  });
});
