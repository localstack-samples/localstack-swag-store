import { getProductStock, adjustInventory } from './lib/test-utils';

const PRODUCT_ID = 'p-sticker-pack-1';

describe('Admin Inventory Management', () => {
  test('adjusts stock successfully', async () => {
    const initial = await getProductStock(PRODUCT_ID);
    const target = (initial || 0) + 50;
    const { status } = await adjustInventory(PRODUCT_ID, target);
    expect(status).toBe(200);
    const after = await getProductStock(PRODUCT_ID);
    expect(after).toBe(target);
  });
});
