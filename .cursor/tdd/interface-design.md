# Interface Design for Testability

**JavaScript** — favor plain functions and explicit dependency objects.

1. **Accept dependencies, don't create them**

   ```javascript
   // Testable
   async function processOrder(order, paymentGateway) { /* ... */ }

   // Hard to test
   async function processOrder(order) {
     const gateway = new PaymentGateway();
   }
   ```

2. **Return results; isolate side effects**

   ```javascript
   // Testable — pure
   function calculateDiscount(cart) {
     return { amount: /* ... */ };
   }

   // Harder — mutates in place
   function applyDiscount(cart) {
     cart.total -= discount;
   }
   ```

3. **Small surface area**
   - Fewer methods → fewer tests
   - Fewer parameters → simpler setup

4. **One entry point per behavior**
   - Prefer one use case / handler / route per test slice
   - Pass dependencies as a `{ portA, portB }` object from the composition root

Adapt layer names (domain, application, infrastructure) to the project's architecture docs.
