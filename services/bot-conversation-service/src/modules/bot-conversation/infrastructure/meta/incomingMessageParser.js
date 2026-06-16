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

module.exports = {
  normalizePhoneDigits,
  normalizeText,
  parseIncomingTextMessage,
};
