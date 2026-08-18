## LocalStack Swag Store - Developer Notes

### Quickstart

1. Prerequisites
   - Node.js 22
   - [`lstk` CLI](https://docs.localstack.cloud/aws/developer-tools/running-localstack/lstk/) and Docker
   - CDK installed
2. Install dependencies
```bash
# Root (tools + lambdas)
npm install
# CDK app
cd cdk && npm install && cd -
```
3. Start LocalStack
```bash
lstk start
```
4. Deploy stacks
```bash
# From cdk/
cd cdk
lstk cdk bootstrap
# Deploy all stacks to LocalStack (uses local AWS creds automatically)
lstk cdk deploy --all --require-approval never
cd -
```
5. Seed products
```bash
npm run seed
```

### Get Your API URL

Discover the API Gateway invoke URL dynamically (preferred):
```bash
API_ID=$(lstk aws apigateway get-rest-apis | jq -r '.items[0].id')
API_URL="https://${API_ID}.execute-api.localhost.localstack.cloud:4566/v1"
echo $API_URL
```
If needed, you can use the alternative path-based format:
```bash
API_URL_ALT="http://localhost:4566/_aws/execute-api/${API_ID}/v1"
```

### Full End-to-End Test Flow

0) Optional: Reset/seed products
```bash
npm run seed
```

1) List products
```bash
curl -s "$API_URL/products" | jq .
```

2) Create a valid order (example: 3x L1 items, claim 3 coins)
```bash
curl -s "$API_URL/orders" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Demo User","email":"demo@example.com","items":[{"productId":"p-sticker-pack-1","quantity":3}],"coinCount":3}' \
  | tee /tmp/order_ok.json
ORDER_ID=$(jq -r '.orderId' /tmp/order_ok.json)
echo $ORDER_ID
```

3) Check order status transition
```bash
sleep 1
curl -s "$API_URL/orders/$ORDER_ID" | jq .
# Expect: status becomes PENDING_VERIFICATION
```

4) Admin: list pending orders
```bash
curl -s "$API_URL/admin/orders?status=PENDING_VERIFICATION" | jq .
```

5) Admin: fulfill the order (atomic stock decrement + status update)
```bash
curl -s "$API_URL/admin/orders/fulfill" \
  -H 'Content-Type: application/json' \
  -d "{\"orderId\":\"$ORDER_ID\"}" | jq .
```

6) Verify final order status and decremented inventory
```bash
# Order
curl -s "$API_URL/orders/$ORDER_ID" | jq .
# Inventory (filter to product used above)
curl -s "$API_URL/products" | jq '.products[] | select(.productId=="p-sticker-pack-1")'
```

7) Admin: stats endpoint
```bash
curl -s "$API_URL/admin/stats" | jq .
```

### Alternate Scenarios

- Insufficient coins for an L3 item (should fail validation):
```bash
curl -s "$API_URL/orders" \
  -H 'Content-Type: application/json' \
  -d '{"name":"User A","email":"a@example.com","items":[{"productId":"p-water-bottle-1","quantity":1}],"coinCount":2}' \
  | tee /tmp/order_insufficient.json
ORDER_INSUFF=$(jq -r '.orderId' /tmp/order_insufficient.json)
sleep 1
curl -s "$API_URL/orders/$ORDER_INSUFF" | jq .
# Expect: status = FAILED_INSUFFICIENT_COINS
```

### Running Tests

```bash
npm test
```

### Notes

- Backend validation uses a single `claimedCoinCount` against product `requiredCoins * quantity`.
- Inventory only changes during admin fulfillment (DynamoDB TransactWrite).
