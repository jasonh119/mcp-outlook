const handleCreateFolder = require('../../folder/create');
const { callGraphAPI } = require('../../utils/graph-api');
const { ensureAuthenticated } = require('../../auth');
const { getFolderIdByName } = require('../../email/folder-utils');
const { MOCK_ACCESS_TOKEN, setupHandlerMocks, teardownHandlerMocks } = require('../helpers/mocks');

jest.mock('../../utils/graph-api');
jest.mock('../../auth');
jest.mock('../../email/folder-utils');

describe('handleCreateFolder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupHandlerMocks();
  });

  afterEach(teardownHandlerMocks);

  describe('input validation', () => {
    test('should return error when no folder name provided', async () => {
      const result = await handleCreateFolder({});
      expect(result.content[0].text).toBe('Folder name is required.');
    });
  });

  describe('successful creation', () => {
    test('should create folder at root level', async () => {
      ensureAuthenticated.mockResolvedValue(MOCK_ACCESS_TOKEN);
      getFolderIdByName.mockResolvedValue(null); // No existing folder
      callGraphAPI.mockResolvedValue({ id: 'new-folder-id' });

      const result = await handleCreateFolder({ name: 'NewFolder' });

      expect(callGraphAPI).toHaveBeenCalledWith(
        MOCK_ACCESS_TOKEN,
        'POST',
        'me/mailFolders',
        { displayName: 'NewFolder' }
      );
      expect(result.content[0].text).toContain('Successfully created');
      expect(result.content[0].text).toContain('root level');
    });

    test('should create folder inside parent folder', async () => {
      ensureAuthenticated.mockResolvedValue(MOCK_ACCESS_TOKEN);
      getFolderIdByName
        .mockResolvedValueOnce(null) // No existing folder with same name
        .mockResolvedValueOnce('parent-id'); // Parent folder found
      callGraphAPI.mockResolvedValue({ id: 'new-folder-id' });

      const result = await handleCreateFolder({ name: 'SubFolder', parentFolder: 'ParentFolder' });

      expect(callGraphAPI).toHaveBeenCalledWith(
        MOCK_ACCESS_TOKEN,
        'POST',
        'me/mailFolders/parent-id/childFolders',
        { displayName: 'SubFolder' }
      );
      expect(result.content[0].text).toContain('inside "ParentFolder"');
    });

    test('should return error if folder already exists', async () => {
      ensureAuthenticated.mockResolvedValue(MOCK_ACCESS_TOKEN);
      getFolderIdByName.mockResolvedValue('existing-id');

      const result = await handleCreateFolder({ name: 'ExistingFolder' });

      expect(result.content[0].text).toContain('already exists');
    });

    test('should return error if parent folder not found', async () => {
      ensureAuthenticated.mockResolvedValue(MOCK_ACCESS_TOKEN);
      getFolderIdByName
        .mockResolvedValueOnce(null) // No existing folder
        .mockResolvedValueOnce(null); // Parent not found

      const result = await handleCreateFolder({ name: 'New', parentFolder: 'Missing' });

      expect(result.content[0].text).toContain('Parent folder "Missing" not found');
    });
  });

  describe('error handling', () => {
    test('should handle authentication error', async () => {
      ensureAuthenticated.mockRejectedValue(new Error('Authentication required'));

      const result = await handleCreateFolder({ name: 'Test' });

      expect(result.content[0].text).toBe(
        "Authentication required. Please use the 'authenticate' tool first."
      );
    });

    test('should handle API error', async () => {
      ensureAuthenticated.mockResolvedValue(MOCK_ACCESS_TOKEN);
      getFolderIdByName.mockResolvedValue(null);
      callGraphAPI.mockRejectedValue(new Error('Create failed'));

      const result = await handleCreateFolder({ name: 'Test' });

      expect(result.content[0].text).toBe('Error creating folder: Create failed');
    });
  });
});
