const handleMarkAsRead = require('../../email/mark-as-read');
const { callGraphAPI } = require('../../utils/graph-api');
const { ensureAuthenticated } = require('../../auth');
const { MOCK_ACCESS_TOKEN, setupHandlerMocks, teardownHandlerMocks } = require('../helpers/mocks');

jest.mock('../../utils/graph-api');
jest.mock('../../auth');

describe('handleMarkAsRead', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupHandlerMocks();
  });

  afterEach(teardownHandlerMocks);

  describe('input validation', () => {
    test('should return error when no email ID provided', async () => {
      const result = await handleMarkAsRead({});
      expect(result.content[0].text).toBe('Email ID is required.');
    });
  });

  describe('successful operations', () => {
    test('should mark email as read by default', async () => {
      ensureAuthenticated.mockResolvedValue(MOCK_ACCESS_TOKEN);
      callGraphAPI.mockResolvedValue({});

      const result = await handleMarkAsRead({ id: 'email-1' });

      expect(callGraphAPI).toHaveBeenCalledWith(
        MOCK_ACCESS_TOKEN,
        'PATCH',
        `me/messages/${encodeURIComponent('email-1')}`,
        { isRead: true }
      );
      expect(result.content[0].text).toContain('marked as read');
    });

    test('should mark email as unread when isRead is false', async () => {
      ensureAuthenticated.mockResolvedValue(MOCK_ACCESS_TOKEN);
      callGraphAPI.mockResolvedValue({});

      const result = await handleMarkAsRead({ id: 'email-1', isRead: false });

      expect(callGraphAPI).toHaveBeenCalledWith(
        MOCK_ACCESS_TOKEN,
        'PATCH',
        expect.any(String),
        { isRead: false }
      );
      expect(result.content[0].text).toContain('marked as unread');
    });
  });

  describe('error handling', () => {
    test('should handle authentication error', async () => {
      ensureAuthenticated.mockRejectedValue(new Error('Authentication required'));

      const result = await handleMarkAsRead({ id: 'test-id' });

      expect(result.content[0].text).toBe(
        "Authentication required. Please use the 'authenticate' tool first."
      );
    });

    test('should handle invalid mailbox error', async () => {
      ensureAuthenticated.mockResolvedValue(MOCK_ACCESS_TOKEN);
      callGraphAPI.mockRejectedValue(new Error("The item doesn't belong to the targeted mailbox"));

      const result = await handleMarkAsRead({ id: 'bad-id' });

      expect(result.content[0].text).toContain('email ID seems invalid');
    });

    test('should handle generic API error', async () => {
      ensureAuthenticated.mockResolvedValue(MOCK_ACCESS_TOKEN);
      callGraphAPI.mockRejectedValue(new Error('Server Error'));

      const result = await handleMarkAsRead({ id: 'test-id' });

      expect(result.content[0].text).toContain('Failed to mark email');
    });
  });
});
