const handleCreateRule = require('../../rules/create');
const { callGraphAPI } = require('../../utils/graph-api');
const { ensureAuthenticated } = require('../../auth');
const { getFolderIdByName } = require('../../email/folder-utils');
const { MOCK_ACCESS_TOKEN, setupHandlerMocks, teardownHandlerMocks } = require('../helpers/mocks');

jest.mock('../../utils/graph-api');
jest.mock('../../auth');
jest.mock('../../email/folder-utils');

describe('handleCreateRule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupHandlerMocks();
  });

  afterEach(teardownHandlerMocks);

  describe('input validation', () => {
    test('should return error when no name provided', async () => {
      const result = await handleCreateRule({ fromAddresses: 'a@b.com', markAsRead: true });
      expect(result.content[0].text).toBe('Rule name is required.');
    });

    test('should return error when no condition provided', async () => {
      const result = await handleCreateRule({ name: 'Test', markAsRead: true });
      expect(result.content[0].text).toContain('At least one condition is required');
    });

    test('should return error when no action provided', async () => {
      const result = await handleCreateRule({ name: 'Test', fromAddresses: 'a@b.com' });
      expect(result.content[0].text).toContain('At least one action is required');
    });

    test('should return error for invalid sequence', async () => {
      const result = await handleCreateRule({
        name: 'Test',
        fromAddresses: 'a@b.com',
        markAsRead: true,
        sequence: -1
      });
      expect(result.content[0].text).toContain('Sequence must be a positive number');
    });
  });

  describe('successful creation', () => {
    test('should create rule with from address and markAsRead', async () => {
      ensureAuthenticated.mockResolvedValue(MOCK_ACCESS_TOKEN);
      // getInboxRules call (via require('./list').getInboxRules)
      callGraphAPI
        .mockResolvedValueOnce({ value: [] }) // getInboxRules returns empty
        .mockResolvedValueOnce({ id: 'new-rule-id' }); // create rule

      const result = await handleCreateRule({
        name: 'Newsletter Filter',
        fromAddresses: 'news@example.com',
        markAsRead: true
      });

      expect(result.content[0].text).toContain('Successfully created rule');
      expect(result.content[0].text).toContain('Newsletter Filter');
    });

    test('should create rule with moveToFolder', async () => {
      ensureAuthenticated.mockResolvedValue(MOCK_ACCESS_TOKEN);
      getFolderIdByName.mockResolvedValue('target-folder-id');
      callGraphAPI
        .mockResolvedValueOnce({ value: [] }) // getInboxRules
        .mockResolvedValueOnce({ id: 'new-rule-id' }); // create rule

      const result = await handleCreateRule({
        name: 'Archive Rule',
        containsSubject: 'newsletter',
        moveToFolder: 'Archive'
      });

      expect(result.content[0].text).toContain('Successfully created rule');
    });

    test('should return error when move target folder not found', async () => {
      ensureAuthenticated.mockResolvedValue(MOCK_ACCESS_TOKEN);
      getFolderIdByName.mockResolvedValue(null);
      callGraphAPI.mockResolvedValue({ value: [] }); // getInboxRules

      const result = await handleCreateRule({
        name: 'Bad Folder',
        fromAddresses: 'a@b.com',
        moveToFolder: 'NonExistent'
      });

      expect(result.content[0].text).toContain('Target folder "NonExistent" not found');
    });
  });

  describe('error handling', () => {
    test('should handle authentication error', async () => {
      ensureAuthenticated.mockRejectedValue(new Error('Authentication required'));

      const result = await handleCreateRule({
        name: 'Test',
        fromAddresses: 'a@b.com',
        markAsRead: true
      });

      expect(result.content[0].text).toBe(
        "Authentication required. Please use the 'authenticate' tool first."
      );
    });

    test('should handle API error', async () => {
      ensureAuthenticated.mockResolvedValue(MOCK_ACCESS_TOKEN);
      callGraphAPI.mockRejectedValue(new Error('Create rule failed'));

      const result = await handleCreateRule({
        name: 'Test',
        fromAddresses: 'a@b.com',
        markAsRead: true
      });

      expect(result.content[0].text).toBe('Error creating rule: Create rule failed');
    });
  });
});
