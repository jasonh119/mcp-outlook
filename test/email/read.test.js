const handleReadEmail = require('../../email/read');
const { callGraphAPI } = require('../../utils/graph-api');
const { ensureAuthenticated } = require('../../auth');
const { MOCK_ACCESS_TOKEN, mockEmails, setupHandlerMocks, teardownHandlerMocks } = require('../helpers/mocks');

jest.mock('../../utils/graph-api');
jest.mock('../../auth');

describe('handleReadEmail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupHandlerMocks();
  });

  afterEach(teardownHandlerMocks);

  describe('input validation', () => {
    test('should return error when no email ID provided', async () => {
      const result = await handleReadEmail({});

      expect(result.content[0].text).toBe('Email ID is required.');
      expect(ensureAuthenticated).not.toHaveBeenCalled();
    });
  });

  describe('successful read', () => {
    test('should return formatted email with text body', async () => {
      ensureAuthenticated.mockResolvedValue(MOCK_ACCESS_TOKEN);
      callGraphAPI.mockResolvedValue(mockEmails.basic);

      const result = await handleReadEmail({ id: 'email-1' });

      expect(result.content[0].text).toContain('From: John Doe (john@example.com)');
      expect(result.content[0].text).toContain('To: Me (me@example.com)');
      expect(result.content[0].text).toContain('Subject: Test Email 1');
      expect(result.content[0].text).toContain('This is the full email body content');
    });

    test('should strip HTML tags from HTML body', async () => {
      ensureAuthenticated.mockResolvedValue(MOCK_ACCESS_TOKEN);
      callGraphAPI.mockResolvedValue(mockEmails.read);

      const result = await handleReadEmail({ id: 'email-2' });

      expect(result.content[0].text).toContain('HTML email content');
      expect(result.content[0].text).not.toContain('<html>');
      expect(result.content[0].text).toContain('CC: Bob (bob@example.com)');
    });

    test('should handle email with no body', async () => {
      const emailNoBody = { ...mockEmails.basic, body: null, bodyPreview: 'Preview text' };
      ensureAuthenticated.mockResolvedValue(MOCK_ACCESS_TOKEN);
      callGraphAPI.mockResolvedValue(emailNoBody);

      const result = await handleReadEmail({ id: 'email-1' });

      expect(result.content[0].text).toContain('Preview text');
    });

    test('should handle email not found', async () => {
      ensureAuthenticated.mockResolvedValue(MOCK_ACCESS_TOKEN);
      callGraphAPI.mockResolvedValue(null);

      const result = await handleReadEmail({ id: 'nonexistent' });

      expect(result.content[0].text).toContain('not found');
    });
  });

  describe('error handling', () => {
    test('should handle authentication error', async () => {
      ensureAuthenticated.mockRejectedValue(new Error('Authentication required'));

      const result = await handleReadEmail({ id: 'test-id' });

      expect(result.content[0].text).toBe(
        "Authentication required. Please use the 'authenticate' tool first."
      );
    });

    test('should handle invalid mailbox error', async () => {
      ensureAuthenticated.mockResolvedValue(MOCK_ACCESS_TOKEN);
      callGraphAPI.mockRejectedValue(new Error("The item doesn't belong to the targeted mailbox"));

      const result = await handleReadEmail({ id: 'bad-id' });

      expect(result.content[0].text).toContain("email ID seems invalid");
    });

    test('should handle generic API error', async () => {
      ensureAuthenticated.mockResolvedValue(MOCK_ACCESS_TOKEN);
      callGraphAPI.mockRejectedValue(new Error('Server Error'));

      const result = await handleReadEmail({ id: 'test-id' });

      expect(result.content[0].text).toBe('Failed to read email: Server Error');
    });
  });
});
