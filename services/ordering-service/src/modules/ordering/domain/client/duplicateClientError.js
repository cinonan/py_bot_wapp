class DuplicateClientError extends Error {
  constructor(message = 'Client already registered for this phone') {
    super(message);
    this.name = 'DuplicateClientError';
  }
}

module.exports = { DuplicateClientError };
