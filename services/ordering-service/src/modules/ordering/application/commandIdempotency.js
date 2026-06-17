/**
 * @typedef {import('../infrastructure/redis/processedCommandCache').ProcessedCommandCachePort} ProcessedCommandCachePort
 * @typedef {import('../infrastructure/postgres/processedCommandRepository').ProcessedCommandRepositoryPort} ProcessedCommandRepositoryPort
 */

/**
 * @param {{
 *   processedCommandCache: ProcessedCommandCachePort,
 *   processedCommandRepository: ProcessedCommandRepositoryPort,
 * }} deps
 */
function createCommandIdempotency({ processedCommandCache, processedCommandRepository }) {
  async function findDuplicate(wamid) {
    const cached = await processedCommandCache.get(wamid);
    if (cached) {
      return { duplicate: true, cached };
    }

    const persisted = await processedCommandRepository.exists(wamid);
    if (persisted) {
      return { duplicate: true, cached: null };
    }

    return { duplicate: false, cached: null };
  }

  async function recordProcessed({ wamid, tipoComando, eventType, payload }) {
    await processedCommandRepository.insert({ wamid, tipoComando });
    await processedCommandCache.set(wamid, { eventType, payload });
  }

  function wrapPublishStreamEvent(basePublish) {
    return async function recordingPublishStreamEvent(envelope, eventType, payload) {
      await basePublish(envelope, eventType, payload);
      await recordProcessed({
        wamid: envelope.wamid,
        tipoComando: envelope.type,
        eventType,
        payload,
      });
    };
  }

  return {
    findDuplicate,
    recordProcessed,
    wrapPublishStreamEvent,
  };
}

module.exports = { createCommandIdempotency };
