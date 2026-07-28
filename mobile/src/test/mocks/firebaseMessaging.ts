const handlers: { message?: (msg: unknown) => void; tokenRefresh?: (t: string) => void } = {};

const messagingInstance = {
  getToken: jest.fn(async () => 'test-fcm-token'),
  deleteToken: jest.fn(async () => {}),
  onMessage: jest.fn((fn: (msg: unknown) => void) => { handlers.message = fn; return () => {}; }),
  onTokenRefresh: jest.fn((fn: (t: string) => void) => { handlers.tokenRefresh = fn; return () => {}; }),
  onNotificationOpenedApp: jest.fn(() => () => {}),
  getInitialNotification: jest.fn(async () => null),
  setBackgroundMessageHandler: jest.fn(),
};

const messaging = () => messagingInstance;
messaging._instance = messagingInstance;
messaging._handlers = handlers;
export default messaging;
