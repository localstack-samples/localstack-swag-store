import axios from 'axios';

function apiUrl(): string {
  const url = process.env.API_URL;
  if (!url) throw new Error('API_URL environment variable is not set.');
  return url;
}

export async function listProducts() {
  const { data } = await axios.get(`${apiUrl()}/products`);
  return data.products;
}

export async function createOrder(payload: any) {
  try {
    const response = await axios.post(`${apiUrl()}/orders`, payload);
    return { data: response.data, status: response.status };
  } catch (error: any) {
    return { data: error.response?.data, status: error.response?.status };
  }
}

export async function getOrder(orderId: string) {
  try {
    const response = await axios.get(`${apiUrl()}/orders/${orderId}`);
    return { data: response.data, status: response.status };
  } catch (error: any) {
    return { data: error.response?.data, status: error.response?.status };
  }
}

export async function waitForOrderStatus(orderId: string, targetStatus: string, timeoutMs: number = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (!orderId) throw new Error('waitForOrderStatus called without a valid orderId');
    const { data, status } = await getOrder(orderId);
    if (status === 200 && data.order && data.order.status === targetStatus) return data.order;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Timeout waiting for order ${orderId} to reach status ${targetStatus}`);
}

export async function fulfillOrder(orderId: string) {
  try {
    const response = await axios.post(`${apiUrl()}/admin/orders/fulfill`, { orderId });
    return { data: response.data, status: response.status };
  } catch (error: any) {
    return { data: error.response?.data, status: error.response?.status };
  }
}

export async function adjustInventory(productId: string, quantity: number) {
  try {
    const response = await axios.post(`${apiUrl()}/admin/inventory/adjust`, { productId, quantity });
    return { data: response.data, status: response.status };
  } catch (error: any) {
    return { data: error.response?.data, status: error.response?.status };
  }
}

export async function getProductStock(productId: string) {
  const products = await listProducts();
  const product = products.find((p: any) => p.productId === productId);
  return product ? product.stock : undefined;
}

export async function listAdminOrders(status?: string) {
  try {
    const url = status ? `${apiUrl()}/admin/orders?status=${status}` : `${apiUrl()}/admin/orders`;
    const response = await axios.get(url);
    return { data: response.data, status: response.status };
  } catch (error: any) {
    return { data: error.response?.data, status: error.response?.status };
  }
}

export async function getAdminStats() {
  try {
    const response = await axios.get(`${apiUrl()}/admin/stats`);
    return { data: response.data, status: response.status };
  } catch (error: any) {
    return { data: error.response?.data, status: error.response?.status };
  }
}
