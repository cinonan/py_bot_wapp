/**
 * @typedef {object} MessageSenderPort
 * @property {(phone: string, text: string) => Promise<void>} sendTextMessage
 */

/**
 * @returns {MessageSenderPort & { sent: Array<{ phone: string, text: string }> }}
 */
function createCollectingMessageSender() {
  const sent = [];

  return {
    sent,
    async sendTextMessage(phone, text) {
      sent.push({ phone, text });
    },
  };
}

/**
 * @returns {MessageSenderPort}
 */
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
