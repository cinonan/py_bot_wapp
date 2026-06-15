function createCollectingMessageSender() {
  const sent = [];

  return {
    sent,
    async sendTextMessage(phone, text) {
      sent.push({ phone, text });
    },
  };
}

function createLoggingMessageSender() {
  return {
    async sendTextMessage(phone, text) {
      console.log(`[message] ${phone}: ${text}`);
    },
  };
}

module.exports = {
  createCollectingMessageSender,
  createLoggingMessageSender,
};
