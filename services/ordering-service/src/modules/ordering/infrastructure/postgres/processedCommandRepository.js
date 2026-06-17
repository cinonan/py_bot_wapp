/**
 * @typedef {object} ProcessedCommandRepositoryPort
 * @property {(wamid: string) => Promise<boolean>} exists
 * @property {(params: { wamid: string, tipoComando: string }) => Promise<void>} insert
 */

/**
 * @param {import('pg').Pool} pool
 * @returns {ProcessedCommandRepositoryPort}
 */
function createProcessedCommandRepository(pool) {
  return {
    async exists(wamid) {
      const result = await pool.query(
        'SELECT 1 FROM comandos_procesados WHERE wamid = $1',
        [wamid],
      );
      return result.rowCount > 0;
    },

    async insert({ wamid, tipoComando }) {
      await pool.query(
        `INSERT INTO comandos_procesados (wamid, tipo_comando)
         VALUES ($1, $2)
         ON CONFLICT (wamid) DO NOTHING`,
        [wamid, tipoComando],
      );
    },
  };
}

module.exports = { createProcessedCommandRepository };
