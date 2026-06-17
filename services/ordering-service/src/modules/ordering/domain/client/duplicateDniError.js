class DuplicateDniError extends Error {
  constructor(message = 'DNI already registered to another client') {
    super(message);
    this.name = 'DuplicateDniError';
  }
}

module.exports = { DuplicateDniError };
