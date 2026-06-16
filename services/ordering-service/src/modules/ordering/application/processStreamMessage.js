const { ZodError } = require('zod');
const { parseStreamFields } = require('../domain/messaging/messageSchemas');
const { classifyStreamProcessingError } = require('../domain/messaging/streamErrorClassification');
const { resolveFailedEventType } = require('../domain/messaging/failedEventType');

function extractMessageContext(fields) {
  const record = parseStreamFields(fields);

  return {
    type: record.type || 'Unknown',
    wamid: record.wamid || 'unknown',
    correlationId: record.correlationId || 'unknown',
    phone: record.phone || 'unknown',
    timestamp: record.timestamp || new Date().toISOString(),
    payload: record.payload ?? '{}',
  };
}

function buildFailurePayload(error) {
  if (error instanceof ZodError) {
    return {
      reason: 'validation',
      issues: error.issues.map((issue) => issue.message),
    };
  }

  if (error.name === 'UnknownCommandError') {
    return {
      reason: 'unknown_command',
      message: error.message,
    };
  }

  return {
    reason: 'processing_error',
    message: error.message,
  };
}

function createProcessStreamMessage({
  dispatchStreamCommand,
  publishStreamEvent,
  publishToDlq,
  maxRetries,
  logger,
}) {
  return async function processStreamMessage({ messageId, fields, deliveryCount }) {
    const context = extractMessageContext(fields);

    try {
      await dispatchStreamCommand({ fields });
      return { ack: true };
    } catch (error) {
      const classification = classifyStreamProcessingError(error);

      if (classification === 'permanent_validation') {
        const failedEventType = resolveFailedEventType(context.type);
        await publishStreamEvent(context, failedEventType, buildFailurePayload(error));
        logger.logPermanentFailure({
          correlationId: context.correlationId,
          wamid: context.wamid,
          messageId,
          commandType: context.type,
          error,
        });
        return { ack: true };
      }

      if (classification === 'transient') {
        logger.logTransientFailure({
          correlationId: context.correlationId,
          wamid: context.wamid,
          messageId,
          attempt: deliveryCount,
          error,
        });
        return { ack: false };
      }

      if (deliveryCount >= maxRetries) {
        await publishToDlq({ messageId, fields, error, context });
        logger.logDlq({
          correlationId: context.correlationId,
          wamid: context.wamid,
          messageId,
          attempt: deliveryCount,
          error,
        });
        return { ack: true };
      }

      logger.logTransientFailure({
        correlationId: context.correlationId,
        wamid: context.wamid,
        messageId,
        attempt: deliveryCount,
        error,
      });
      return { ack: false };
    }
  };
}

module.exports = { createProcessStreamMessage, extractMessageContext };
