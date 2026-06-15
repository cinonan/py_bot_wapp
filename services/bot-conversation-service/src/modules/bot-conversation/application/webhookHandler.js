function normalizePhoneDigits(rawPhone) {
  return String(rawPhone ?? '').replace(/\D/g, '');
}

function normalizeText(text) {
  return String(text ?? '').trim();
}

function parseIncomingTextMessage(body) {
  const message = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!message || message.type !== 'text') {
    return null;
  }

  const phone = normalizePhoneDigits(message.from);
  const text = normalizeText(message.text?.body);
  const wamid = message.id;

  if (!phone || !text || !wamid) {
    return null;
  }

  return { phone, text, wamid };
}

function createWebhookHandler({ handleConversationMessage, messageSender, awaitProcessing = false }) {
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

module.exports = {
  normalizePhoneDigits,
  parseIncomingTextMessage,
  createWebhookHandler,
};
