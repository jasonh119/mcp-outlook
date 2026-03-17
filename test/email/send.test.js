const handleSendEmail = require('../../email/send');
const { callGraphAPI } = require('../../utils/graph-api');
const { ensureAuthenticated } = require('../../auth');
const { MOCK_ACCESS_TOKEN, setupHandlerMocks, teardownHandlerMocks } = require('../helpers/mocks');

jest.mock('../../utils/graph-api');
jest.mock('../../auth');

describe('handleSendEmail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupHandlerMocks();
  });

  afterEach(teardownHandlerMocks);

  describe('input validation', () => {
    test('should return error when no recipient provided', async () => {
      const result = await handleSendEmail({ subject: 'Test', body: 'Hello' });
      expect(result.content[0].text).toBe('Recipient (to) is required.');
    });

    test('should return error when no subject provided', async () => {
      const result = await handleSendEmail({ to: 'test@example.com', body: 'Hello' });
      expect(result.content[0].text).toBe('Subject is required.');
    });

    test('should return error when no body provided', async () => {
      const result = await handleSendEmail({ to: 'test@example.com', subject: 'Test' });
      expect(result.content[0].text).toBe('Body content is required.');
    });
  });

  describe('successful send', () => {
    test('should send email with required fields', async () => {
      ensureAuthenticated.mockResolvedValue(MOCK_ACCESS_TOKEN);
      callGraphAPI.mockResolvedValue({});

      const result = await handleSendEmail({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        body: 'Test body content'
      });

      expect(callGraphAPI).toHaveBeenCalledWith(
        MOCK_ACCESS_TOKEN,
        'POST',
        'me/sendMail',
        expect.objectContaining({
          message: expect.objectContaining({
            subject: 'Test Subject',
            toRecipients: [{ emailAddress: { address: 'recipient@example.com' } }]
          })
        })
      );
      expect(result.content[0].text).toContain('Email sent successfully');
    });

    test('should handle multiple recipients with CC and BCC', async () => {
      ensureAuthenticated.mockResolvedValue(MOCK_ACCESS_TOKEN);
      callGraphAPI.mockResolvedValue({});

      const result = await handleSendEmail({
        to: 'a@example.com, b@example.com',
        cc: 'cc@example.com',
        bcc: 'bcc@example.com',
        subject: 'Multi',
        body: 'Test'
      });

      const sentPayload = callGraphAPI.mock.calls[0][3];
      expect(sentPayload.message.toRecipients).toHaveLength(2);
      expect(sentPayload.message.ccRecipients).toHaveLength(1);
      expect(sentPayload.message.bccRecipients).toHaveLength(1);
      expect(result.content[0].text).toContain('2');
      expect(result.content[0].text).toContain('1 CC');
      expect(result.content[0].text).toContain('1 BCC');
    });

    test('should detect HTML content type', async () => {
      ensureAuthenticated.mockResolvedValue(MOCK_ACCESS_TOKEN);
      callGraphAPI.mockResolvedValue({});

      await handleSendEmail({
        to: 'test@example.com',
        subject: 'HTML',
        body: '<html><body>Hello</body></html>'
      });

      const sentPayload = callGraphAPI.mock.calls[0][3];
      expect(sentPayload.message.body.contentType).toBe('html');
    });

    test('should use text content type for plain text', async () => {
      ensureAuthenticated.mockResolvedValue(MOCK_ACCESS_TOKEN);
      callGraphAPI.mockResolvedValue({});

      await handleSendEmail({
        to: 'test@example.com',
        subject: 'Plain',
        body: 'Just plain text'
      });

      const sentPayload = callGraphAPI.mock.calls[0][3];
      expect(sentPayload.message.body.contentType).toBe('text');
    });
  });

  describe('error handling', () => {
    test('should handle authentication error', async () => {
      ensureAuthenticated.mockRejectedValue(new Error('Authentication required'));

      const result = await handleSendEmail({ to: 'a@b.com', subject: 'S', body: 'B' });

      expect(result.content[0].text).toBe(
        "Authentication required. Please use the 'authenticate' tool first."
      );
    });

    test('should handle API error', async () => {
      ensureAuthenticated.mockResolvedValue(MOCK_ACCESS_TOKEN);
      callGraphAPI.mockRejectedValue(new Error('Send failed'));

      const result = await handleSendEmail({ to: 'a@b.com', subject: 'S', body: 'B' });

      expect(result.content[0].text).toBe('Error sending email: Send failed');
    });
  });
});
