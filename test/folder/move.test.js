const handleMoveEmails = require('../../folder/move');
const { callGraphAPI } = require('../../utils/graph-api');
const { ensureAuthenticated } = require('../../auth');
const { getFolderIdByName } = require('../../email/folder-utils');
const { MOCK_ACCESS_TOKEN, setupHandlerMocks, teardownHandlerMocks } = require('../helpers/mocks');

jest.mock('../../utils/graph-api');
jest.mock('../../auth');
jest.mock('../../email/folder-utils');

describe('handleMoveEmails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupHandlerMocks();
  });

  afterEach(teardownHandlerMocks);

  describe('input validation', () => {
    test('should return error when no email IDs provided', async () => {
      const result = await handleMoveEmails({ targetFolder: 'Archive' });
      expect(result.content[0].text).toContain('Email IDs are required');
    });

    test('should return error when no target folder provided', async () => {
      const result = await handleMoveEmails({ emailIds: 'id-1' });
      expect(result.content[0].text).toBe('Target folder name is required.');
    });

    test('should return error when email IDs are empty after parsing', async () => {
      ensureAuthenticated.mockResolvedValue(MOCK_ACCESS_TOKEN);

      const result = await handleMoveEmails({ emailIds: '  ,  , ', targetFolder: 'Archive' });

      expect(result.content[0].text).toBe('No valid email IDs provided.');
    });
  });

  describe('successful moves', () => {
    test('should move single email to target folder', async () => {
      ensureAuthenticated.mockResolvedValue(MOCK_ACCESS_TOKEN);
      getFolderIdByName.mockResolvedValue('target-folder-id');
      callGraphAPI.mockResolvedValue({});

      const result = await handleMoveEmails({ emailIds: 'email-1', targetFolder: 'Archive' });

      expect(callGraphAPI).toHaveBeenCalledWith(
        MOCK_ACCESS_TOKEN,
        'POST',
        'me/messages/email-1/move',
        { destinationId: 'target-folder-id' }
      );
      expect(result.content[0].text).toContain('Successfully moved 1 email');
    });

    test('should move multiple emails', async () => {
      ensureAuthenticated.mockResolvedValue(MOCK_ACCESS_TOKEN);
      getFolderIdByName.mockResolvedValue('target-folder-id');
      callGraphAPI.mockResolvedValue({});

      const result = await handleMoveEmails({
        emailIds: 'email-1, email-2, email-3',
        targetFolder: 'Archive'
      });

      expect(callGraphAPI).toHaveBeenCalledTimes(3);
      expect(result.content[0].text).toContain('Successfully moved 3 email');
    });

    test('should handle partial failures', async () => {
      ensureAuthenticated.mockResolvedValue(MOCK_ACCESS_TOKEN);
      getFolderIdByName.mockResolvedValue('target-folder-id');
      callGraphAPI
        .mockResolvedValueOnce({}) // email-1 succeeds
        .mockRejectedValueOnce(new Error('Not found')); // email-2 fails

      const result = await handleMoveEmails({
        emailIds: 'email-1, email-2',
        targetFolder: 'Archive'
      });

      expect(result.content[0].text).toContain('Successfully moved 1');
      expect(result.content[0].text).toContain('Failed to move 1');
    });

    test('should return error when target folder not found', async () => {
      ensureAuthenticated.mockResolvedValue(MOCK_ACCESS_TOKEN);
      getFolderIdByName.mockResolvedValue(null);

      const result = await handleMoveEmails({ emailIds: 'email-1', targetFolder: 'Missing' });

      expect(result.content[0].text).toContain('Target folder "Missing" not found');
    });
  });

  describe('error handling', () => {
    test('should handle authentication error', async () => {
      ensureAuthenticated.mockRejectedValue(new Error('Authentication required'));

      const result = await handleMoveEmails({ emailIds: 'id-1', targetFolder: 'Archive' });

      expect(result.content[0].text).toBe(
        "Authentication required. Please use the 'authenticate' tool first."
      );
    });

    test('should handle API error during folder lookup', async () => {
      ensureAuthenticated.mockResolvedValue(MOCK_ACCESS_TOKEN);
      getFolderIdByName.mockRejectedValue(new Error('Lookup failed'));

      const result = await handleMoveEmails({ emailIds: 'id-1', targetFolder: 'Archive' });

      expect(result.content[0].text).toBe('Error moving emails: Lookup failed');
    });
  });
});
