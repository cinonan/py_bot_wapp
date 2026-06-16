const { createDependencies } = require('./createDependencies');

/** Full dependency graph for integration/unit tests (SAD § 3.1). */
function createTestDependencies(config = {}) {
  return createDependencies({ ...config, _exposeInternals: true });
}

module.exports = { createTestDependencies };
