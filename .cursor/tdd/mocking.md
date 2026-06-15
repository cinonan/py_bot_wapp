# When to Mock

**JavaScript + Jest.** Mock at **system boundaries** only.

Mock:

- External APIs (payment, email, third-party HTTP)
- Databases (in unit tests — prefer real test DB in integration tests)
- Time / randomness (`jest.useFakeTimers()`)
- File system (sometimes)

Don't mock:

- Your own domain logic
- Internal modules you control
- Code under test

## Designing for mockability

**1. Inject dependencies**

```javascript
// Easy to mock
async function processPayment(order, paymentClient) {
  return paymentClient.charge(order.total);
}

// Hard to mock
async function processPayment(order) {
  const client = new PaymentClient(process.env.PAYMENT_KEY);
  return client.charge(order.total);
}
```

**2. Prefer specific interfaces over generic gateways**

```javascript
// GOOD: each operation independently mockable
const api = {
  getUser: (id) => fetch(`/users/${id}`),
  getOrders: (userId) => fetch(`/users/${userId}/orders`),
  createOrder: (data) => fetch('/orders', { method: 'POST', body: JSON.stringify(data) }),
};

// BAD: conditional logic required inside the mock
const api = {
  fetch: (endpoint, options) => fetch(endpoint, options),
};
```

Use `jest.fn()` per method, not one mega-mock with branches.

Benefits:

- Each fake returns one shape
- No conditional logic in test setup
- Clear which contract each test exercises

## Ports and adapters

In layered or hexagonal architectures: **mock ports** with `jest.fn()` in application tests; use **real adapters** in integration tests. Project docs define which ports exist.

```javascript
const orderRepo = { create: jest.fn().mockResolvedValue({ id: 1 }) };
await placeOrder(command, { orderRepo, eventPublisher });
expect(orderRepo.create).toHaveBeenCalledWith(expect.objectContaining({ /* ... */ }));
```

Assert **outcomes**, not that a port was called unless the contract itself is the behavior under test.

## Manual boundaries

Some external systems may be **out of scope for automation** — check the task or PRD.
