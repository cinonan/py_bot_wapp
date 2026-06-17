const { createHandleConversationMessage } = require('../../src/modules/bot-conversation/application/handleConversationMessage');

describe('handleConversationMessage admin dispatch intercept', () => {
  test('routes Despachar command before session lookup', async () => {
    const sessionStore = {
      get: jest.fn(),
    };
    const handleAdminDispatchMessage = jest.fn().mockResolvedValue({
      replies: ['Despacho confirmado'],
    });

    const handleConversationMessage = createHandleConversationMessage({
      sessionStore,
      streamCommandClient: {},
      adminOrderNotifyPhone: '51999000001',
      handleAdminDispatchMessage,
    });

    const result = await handleConversationMessage({
      phone: '51999000001',
      text: 'Despachar 42',
      wamid: 'wamid.dispatch.intercept',
    });

    expect(handleAdminDispatchMessage).toHaveBeenCalledWith({
      phone: '51999000001',
      wamid: 'wamid.dispatch.intercept',
      orderId: 42,
    });
    expect(sessionStore.get).not.toHaveBeenCalled();
    expect(result.replies[0]).toContain('Despacho confirmado');
  });
});
