/** Stream names aligned with ordering-service domain/messaging (see contracts.md there). */
const STREAM_BOT_EVENTS = 'bot:events';
const STREAM_ORDERING_EVENTS = 'ordering:events';
const CONSUMER_GROUP_BOT = 'bot-conversation-service';

module.exports = {
  STREAM_BOT_EVENTS,
  STREAM_ORDERING_EVENTS,
  CONSUMER_GROUP_BOT,
};
