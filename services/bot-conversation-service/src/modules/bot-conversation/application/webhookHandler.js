/**
 * @typedef {object} IncomingTextMessage
 * @property {string} phone
 * @property {string} text
 * @property {string} wamid
 */

/**
 * @typedef {object} IncomingMessageParserPort
 * @property {(body: object) => IncomingTextMessage|null} parseIncomingTextMessage
 */

/**
 * @typedef {object} MessageSenderPort
 * @property {(phone: string, text: string) => Promise<void>} sendTextMessage
 */

function createWebhookHandler({
  handleConversationMessage,
  messageSender,
  parseIncomingTextMessage,
  awaitProcessing = false,
}) {
  async function processIncoming(incoming) {
    const result = await handleConversationMessage(incoming);

    for (const reply of result.replies) {
      await messageSender.sendTextMessage(incoming.phone, reply);
    }
  }

  return async function handleWebhook(req, res) {
    const incoming = parseIncomingTextMessage(req.body);
    res.sendStatus(200);

    if (!incoming) {
      return;
    }

    try {
      if (awaitProcessing) {
        await processIncoming(incoming);
        return;
      }

      processIncoming(incoming).catch((error) => {
        console.error('Webhook conversation error:', error.message);
      });
    } catch (error) {
      console.error('Webhook conversation error:', error.message);
    }
  };
}

module.exports = { createWebhookHandler };
