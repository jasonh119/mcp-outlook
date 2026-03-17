const handleForwardEmail = require('../../email/forward');
const { callGraphAPI } = require('../../utils/graph-api');
const { ensureAuthenticated } = require('../../auth');
const { MOCK_ACCESS_TOKEN, setupHandlerMocks, teardownHandlerMocks } = require('../helpers/mocks');

jest.mock('../../utils/graph-api');
jest.mock('../../auth');

describe('handleForwardEmail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupHandlerMocks();
  });

  afterEach(teardownHandlerMocks);

  describe('input validation', () => {
    test('should return error when no message ID provided', async () => {
      const result = await handleForwardEmail({ to: 'a@b.com' });
      expect(result.content[0].text).toBe('Message ID (id) is required.');
    });

    test('should return error when no recipient provided', async () => {
      const result = await handleForwardEmail({ id: 'msg-1' });
      expect(result.content[0].text).toBe('Recipient (to) is required.');
    });
  });

  describe('successful forward', () => {
    test('should forward email to single recipient', async () => {
      ensureAuthenticated.mockResolvedValue(MOCK_ACCESS_TOKEN);
      callGraphAPI.mockResolvedValue({});

      const result = await handleForwardEmail({
        id: 'msg-1',
        to: 'forward@example.com'
      });

      expect(callGraphAPI).toHaveBeenCalledWith(
        MOCK_ACCESS_TOKEN,
        'POST',
        'me/messages/msg-1/forward',
        {
          toRecipients: [{ emailAddress: { address: 'forward@example.com' } }],
          comment: ''
        }
      );
      expect(result.content[0].text).toContain('forwarded successfully');
      expect(result.content[0].text).toContain('forward@example.com');
    });

    test('should forward with comment', async () => {
      ensureAuthenticated.mockResolvedValue(MOCK_ACCESS_TOKEN);
      callGraphAPI.mockResolvedValue({});

      const result = await handleForwardEmail({
        id: 'msg-1',
        to: 'forward@example.com',
        comment: 'FYI'
      });

      const payload = callGraphAPI.mock.calls[0][3];
      expect(payload.comment).toBe('FYI');
      expect(result.content[0].text).toContain('Comment: FYI');
    });

    test('should forward to multiple recipients', async () => {
      ensureAuthenticated.mockResolvedValue(MOCK_ACCESS_TOKEN);
      callGraphAPI.mockResolvedValue({});

      await handleForwardEmail({
        id: 'msg-1',
        to: 'a@example.com, b@example.com'
      });

      const payload = callGraphAPI.mock.calls[0][3];
      expect(payload.toRecipients).toHaveLength(2);
    });
  });

  describe('error handling', () => {
    test('should handle authentication error', async () => {
      ensureAuthenticated.mockRejectedValue(new Error('Authentication required'));

      const result = await handleForwardEmail({ id: 'msg-1', to: 'a@b.com' });

      expect(result.content[0].text).toBe(
        "Authentication required. Please use the 'authenticate' tool first."
      );
    });

    test('should handle API error', async () => {
      ensureAuthenticated.mockResolvedValue(MOCK_ACCESS_TOKEN);
      callGraphAPI.mockRejectedValue(new Error('Forward failed'));

      const result = await handleForwardEmail({ id: 'msg-1', to: 'a@b.com' });

      expect(result.content[0].text).toBe('Error forwarding email: Forward failed');
    });
  });
});
