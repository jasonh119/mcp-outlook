const handleListFolders = require('../../folder/list');
const { callGraphAPI } = require('../../utils/graph-api');
const { ensureAuthenticated } = require('../../auth');
const { MOCK_ACCESS_TOKEN, mockFolders, setupHandlerMocks, teardownHandlerMocks } = require('../helpers/mocks');

jest.mock('../../utils/graph-api');
jest.mock('../../auth');

describe('handleListFolders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupHandlerMocks();
  });

  afterEach(teardownHandlerMocks);

  describe('successful listing', () => {
    test('should list folders as flat list by default', async () => {
      ensureAuthenticated.mockResolvedValue(MOCK_ACCESS_TOKEN);
      // custom has childFolderCount 0 here so the handler makes a single top-level
      // request and does not fetch child folders (a persistent mock would otherwise
      // return this same array for the child query and duplicate every folder).
      callGraphAPI.mockResolvedValue({
        value: [mockFolders.inbox, mockFolders.drafts, { ...mockFolders.custom, childFolderCount: 0 }]
      });

      const result = await handleListFolders({});

      expect(result.content[0].text).toContain('Found 3 folders');
      expect(result.content[0].text).toContain('Inbox');
      expect(result.content[0].text).toContain('Drafts');
    });

    test('should include item counts when requested', async () => {
      ensureAuthenticated.mockResolvedValue(MOCK_ACCESS_TOKEN);
      callGraphAPI.mockResolvedValue({
        value: [mockFolders.inbox]
      });

      const result = await handleListFolders({ includeItemCounts: true });

      expect(result.content[0].text).toContain('10 items');
      expect(result.content[0].text).toContain('3 unread');
    });

    test('should show hierarchy when includeChildren is true', async () => {
      ensureAuthenticated.mockResolvedValue(MOCK_ACCESS_TOKEN);
      // First call: top-level folders
      callGraphAPI.mockResolvedValueOnce({
        value: [{ ...mockFolders.custom, childFolderCount: 1 }]
      });
      // Second call: child folders
      callGraphAPI.mockResolvedValueOnce({
        value: [mockFolders.child]
      });

      const result = await handleListFolders({ includeChildren: true });

      expect(result.content[0].text).toContain('Folder Hierarchy');
    });

    test('should return message when no folders found', async () => {
      ensureAuthenticated.mockResolvedValue(MOCK_ACCESS_TOKEN);
      callGraphAPI.mockResolvedValue({ value: [] });

      const result = await handleListFolders({});

      expect(result.content[0].text).toContain('No folders found');
    });
  });

  describe('error handling', () => {
    test('should handle authentication error', async () => {
      ensureAuthenticated.mockRejectedValue(new Error('Authentication required'));

      const result = await handleListFolders({});

      expect(result.content[0].text).toBe(
        "Authentication required. Please use the 'authenticate' tool first."
      );
    });

    test('should handle API error', async () => {
      ensureAuthenticated.mockResolvedValue(MOCK_ACCESS_TOKEN);
      callGraphAPI.mockRejectedValue(new Error('Folder API Error'));

      const result = await handleListFolders({});

      expect(result.content[0].text).toBe('Error listing folders: Folder API Error');
    });
  });
});
