const { createWebhookHandler } = require('../../src/modules/bot-conversation/application/webhookHandler');
const { isDeliveryStatusPayload } = require('../../src/modules/bot-conversation/infrastructure/meta/deliveryStatusDetector');

describe('webhook handler', () => {
  function createDeps(overrides = {}) {
    return {
      handleConversationMessage: jest.fn().mockResolvedValue({ replies: [] }),
      messageSender: { sendTextMessage: jest.fn().mockResolvedValue(undefined) },
      parseIncomingTextMessage: jest.fn().mockReturnValue(null),
      isDeliveryStatusPayload,
      ...overrides,
    };
  }

  test('responds 200 without invoking conversation flow for delivery status payloads', async () => {
    const deps = createDeps();
    const handler = createWebhookHandler(deps);
    const req = {
      body: {
        entry: [
          {
            changes: [
              {
                value: {
                  statuses: [{ id: 'wamid.status.1', status: 'delivered' }],
                },
              },
            ],
          },
        ],
      },
    };
    const res = { sendStatus: jest.fn() };

    await handler(req, res);

    expect(res.sendStatus).toHaveBeenCalledWith(200);
    expect(deps.handleConversationMessage).not.toHaveBeenCalled();
  });

  test('enqueues conversation processing and responds 200 before it finishes', async () => {
    let resolveProcessing;
    const processingStarted = new Promise((resolve) => {
      resolveProcessing = resolve;
    });

    const deps = createDeps({
      parseIncomingTextMessage: jest.fn().mockReturnValue({
        phone: '51999001001',
        text: 'hola',
        wamid: 'wamid.test.1',
      }),
      handleConversationMessage: jest.fn(
        () =>
          new Promise((resolve) => {
            resolveProcessing();
            resolve({ replies: ['Hola'] });
          }),
      ),
    });
    const handler = createWebhookHandler(deps);
    const req = {
      body: {
        entry: [
          {
            changes: [
              {
                value: {
                  messages: [
                    {
                      from: '51999001001',
                      id: 'wamid.test.1',
                      type: 'text',
                      text: { body: 'hola' },
                    },
                  ],
                },
              },
            ],
          },
        ],
      },
    };
    const res = { sendStatus: jest.fn() };

    await handler(req, res);

    expect(res.sendStatus).toHaveBeenCalledWith(200);
    expect(deps.handleConversationMessage).toHaveBeenCalled();
    await processingStarted;
  });
});
