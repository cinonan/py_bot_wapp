# Good and Bad Tests

**JavaScript + Jest** — all examples use the project's test runner.

## Good tests

Test through public interfaces, not internal parts.

```javascript
// GOOD: observable behavior
test('user can checkout with valid cart', async () => {
  const cart = createCart();
  cart.add(product);
  const result = await checkout(cart, paymentMethod);
  expect(result.status).toBe('confirmed');
});
```

Characteristics:

- Behavior users/callers care about
- Public API only
- Survives refactors
- Describes WHAT, not HOW
- One logical focus per test

## Bad tests

Coupled to implementation:

```javascript
// BAD: verifies HOW, not WHAT
test('checkout calls paymentService.process', async () => {
  const mockPayment = { process: jest.fn() };
  await checkout(cart, mockPayment);
  expect(mockPayment.process).toHaveBeenCalledWith(cart.total);
});
```

Red flags:

- Mocking internal collaborators
- Testing private methods
- `toHaveBeenCalled` as the only assertion
- Test breaks on refactor without behavior change
- Test name describes HOW not WHAT

```javascript
// BAD: bypasses interface to verify persistence
test('createUser saves to database', async () => {
  await createUser({ name: 'Alice' });
  const row = await db.query('SELECT * FROM users WHERE name = $1', ['Alice']);
  expect(row).toBeDefined();
});

// GOOD: verifies through public interface
test('createUser makes user retrievable', async () => {
  const user = await createUser({ name: 'Alice' });
  const retrieved = await getUser(user.id);
  expect(retrieved.name).toBe('Alice');
});
```

## Unit vs integration

| Type | When | Dependencies |
|------|------|--------------|
| Unit | Pure logic, use cases with fakes | `jest.fn()` on ports/boundaries only |
| Integration | Persistence, messaging, HTTP | Real test instances (DB, broker) per project docs |

Integration tests still assert **observable outcomes**, not internal steps.

Place unit tests under `tests/unit/` or colocated `*.test.js`; integration under `tests/integration/` — follow existing layout in the service.
