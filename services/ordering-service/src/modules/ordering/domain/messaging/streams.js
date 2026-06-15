/** Canonical Redis Stream names and consumer groups (see contracts.md). */
const STREAM_BOT_EVENTS = 'bot:events';
const STREAM_ORDERING_EVENTS = 'ordering:events';
const STREAM_ORDERING_DLQ = 'ordering:dlq';

const CONSUMER_GROUP_ORDERING = 'ordering-service';
const CONSUMER_GROUP_BOT = 'bot-conversation-service';

module.exports = {
  STREAM_BOT_EVENTS,
  STREAM_ORDERING_EVENTS,
  STREAM_ORDERING_DLQ,
  CONSUMER_GROUP_ORDERING,
  CONSUMER_GROUP_BOT,
};
