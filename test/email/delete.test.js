const handleDeleteEmail = require('../../email/delete');
const { callGraphAPI } = require('../../utils/graph-api');
const { ensureAuthenticated } = require('../../auth');

jest.mock('../../utils/graph-api');
jest.mock('../../auth');

describe('handleDeleteEmail', () => {
  const mockAccessToken = 'mock_access_token_12345';

  beforeEach(() => {
    callGraphAPI.mockClear();
    ensureAuthenticated.mockClear();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  describe('input validation', () => {
    test('should return error when no email ID is provided', async () => {
      const result = await handleDeleteEmail({});

      expect(result.content[0].text).toBe('Email ID is required.');
      expect(ensureAuthenticated).not.toHaveBeenCalled();
      expect(callGraphAPI).not.toHaveBeenCalled();
    });
  });

  describe('successful deletion', () => {
    test('should move email to Deleted Items', async () => {
      const emailId = 'test-email-id-123';
      ensureAuthenticated.mockResolvedValue(mockAccessToken);
      callGraphAPI.mockResolvedValue({ id: 'moved-email-id' });

      const result = await handleDeleteEmail({ id: emailId });

      expect(ensureAuthenticated).toHaveBeenCalledTimes(1);
      expect(callGraphAPI).toHaveBeenCalledWith(
        mockAccessToken,
        'POST',
        `me/messages/${encodeURIComponent(emailId)}/move`,
        { destinationId: 'deleteditems' }
      );
      expect(result.content[0].text).toBe('Email moved to Deleted Items.');
    });

    test('should encode email ID in endpoint', async () => {
      const emailId = 'AQMkADAwATM3ZmYAZS1i+test=';
      ensureAuthenticated.mockResolvedValue(mockAccessToken);
      callGraphAPI.mockResolvedValue({ id: 'moved-email-id' });

      await handleDeleteEmail({ id: emailId });

      expect(callGraphAPI).toHaveBeenCalledWith(
        mockAccessToken,
        'POST',
        `me/messages/${encodeURIComponent(emailId)}/move`,
        { destinationId: 'deleteditems' }
      );
    });
  });

  describe('error handling', () => {
    test('should handle authentication error', async () => {
      ensureAuthenticated.mockRejectedValue(new Error('Authentication required'));

      const result = await handleDeleteEmail({ id: 'test-id' });

      expect(result.content[0].text).toBe(
        "Authentication required. Please use the 'authenticate' tool first."
      );
      expect(callGraphAPI).not.toHaveBeenCalled();
    });

    test('should handle invalid mailbox error', async () => {
      ensureAuthenticated.mockResolvedValue(mockAccessToken);
      callGraphAPI.mockRejectedValue(
        new Error("The item doesn't belong to the targeted mailbox")
      );

      const result = await handleDeleteEmail({ id: 'bad-id' });

      expect(result.content[0].text).toBe(
        "The email ID seems invalid or doesn't belong to your mailbox. Please try with a different email ID."
      );
    });

    test('should handle generic Graph API error', async () => {
      ensureAuthenticated.mockResolvedValue(mockAccessToken);
      callGraphAPI.mockRejectedValue(new Error('Graph API Error: 500'));

      const result = await handleDeleteEmail({ id: 'test-id' });

      expect(result.content[0].text).toBe('Error deleting email: Graph API Error: 500');
    });

    test('should handle network error', async () => {
      ensureAuthenticated.mockResolvedValue(mockAccessToken);
      callGraphAPI.mockRejectedValue(new Error('Network error during API call'));

      const result = await handleDeleteEmail({ id: 'test-id' });

      expect(result.content[0].text).toBe('Error deleting email: Network error during API call');
    });
  });
});
