const handleSearchEmails = require('../../email/search');
const { callGraphAPIPaginated } = require('../../utils/graph-api');
const { ensureAuthenticated } = require('../../auth');
const { resolveFolderPath } = require('../../email/folder-utils');
const { MOCK_ACCESS_TOKEN, mockEmails, setupHandlerMocks, teardownHandlerMocks } = require('../helpers/mocks');

jest.mock('../../utils/graph-api');
jest.mock('../../auth');
jest.mock('../../email/folder-utils');

describe('handleSearchEmails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupHandlerMocks();
  });

  afterEach(teardownHandlerMocks);

  describe('successful search', () => {
    test('should search emails with query term', async () => {
      ensureAuthenticated.mockResolvedValue(MOCK_ACCESS_TOKEN);
      resolveFolderPath.mockResolvedValue('me/mailFolders/inbox/messages');
      callGraphAPIPaginated.mockResolvedValue({ value: [mockEmails.basic] });

      const result = await handleSearchEmails({ query: 'test' });

      expect(result.content[0].text).toContain('Found 1 emails');
      expect(result.content[0].text).toContain('Test Email 1');
    });

    test('should return no results message when nothing found', async () => {
      ensureAuthenticated.mockResolvedValue(MOCK_ACCESS_TOKEN);
      resolveFolderPath.mockResolvedValue('me/mailFolders/inbox/messages');
      callGraphAPIPaginated.mockResolvedValue({ value: [] });

      const result = await handleSearchEmails({ query: 'nonexistent' });

      expect(result.content[0].text).toContain('No emails found matching your search criteria');
    });

    test('should search in specified folder', async () => {
      ensureAuthenticated.mockResolvedValue(MOCK_ACCESS_TOKEN);
      resolveFolderPath.mockResolvedValue('me/mailFolders/sentItems/messages');
      callGraphAPIPaginated.mockResolvedValue({ value: [mockEmails.read] });

      await handleSearchEmails({ query: 'test', folder: 'sent' });

      expect(resolveFolderPath).toHaveBeenCalledWith(MOCK_ACCESS_TOKEN, 'sent');
    });
  });

  describe('error handling', () => {
    test('should handle authentication error', async () => {
      ensureAuthenticated.mockRejectedValue(new Error('Authentication required'));

      const result = await handleSearchEmails({ query: 'test' });

      expect(result.content[0].text).toBe(
        "Authentication required. Please use the 'authenticate' tool first."
      );
    });

    test('should handle API error', async () => {
      ensureAuthenticated.mockResolvedValue(MOCK_ACCESS_TOKEN);
      resolveFolderPath.mockResolvedValue('me/mailFolders/inbox/messages');
      callGraphAPIPaginated.mockRejectedValue(new Error('API Error'));

      const result = await handleSearchEmails({ query: 'test' });

      expect(result.content[0].text).toBe('Error searching emails: API Error');
    });
  });

  describe('filter parameters', () => {
    test('should search with from filter', async () => {
      ensureAuthenticated.mockResolvedValue(MOCK_ACCESS_TOKEN);
      resolveFolderPath.mockResolvedValue('me/mailFolders/inbox/messages');
      callGraphAPIPaginated.mockResolvedValue({ value: [mockEmails.basic] });

      await handleSearchEmails({ from: 'boss@example.com' });

      const params = callGraphAPIPaginated.mock.calls[0][3];
      expect(params.$search).toContain('from:"boss@example.com"');
    });

    test('should search with subject filter', async () => {
      ensureAuthenticated.mockResolvedValue(MOCK_ACCESS_TOKEN);
      resolveFolderPath.mockResolvedValue('me/mailFolders/inbox/messages');
      callGraphAPIPaginated.mockResolvedValue({ value: [mockEmails.basic] });

      await handleSearchEmails({ subject: 'Weekly report' });

      const params = callGraphAPIPaginated.mock.calls[0][3];
      expect(params.$search).toContain('subject:"Weekly report"');
    });

    test('should search with to filter', async () => {
      ensureAuthenticated.mockResolvedValue(MOCK_ACCESS_TOKEN);
      resolveFolderPath.mockResolvedValue('me/mailFolders/inbox/messages');
      callGraphAPIPaginated.mockResolvedValue({ value: [mockEmails.basic] });

      await handleSearchEmails({ to: 'me@example.com' });

      const params = callGraphAPIPaginated.mock.calls[0][3];
      expect(params.$search).toContain('to:"me@example.com"');
    });

    test('should add $filter for hasAttachments', async () => {
      ensureAuthenticated.mockResolvedValue(MOCK_ACCESS_TOKEN);
      resolveFolderPath.mockResolvedValue('me/mailFolders/inbox/messages');
      callGraphAPIPaginated.mockResolvedValue({ value: [mockEmails.read] });

      await handleSearchEmails({ hasAttachments: true });

      const params = callGraphAPIPaginated.mock.calls[0][3];
      expect(params.$filter).toContain('hasAttachments eq true');
    });

    test('should add $filter for unreadOnly', async () => {
      ensureAuthenticated.mockResolvedValue(MOCK_ACCESS_TOKEN);
      resolveFolderPath.mockResolvedValue('me/mailFolders/inbox/messages');
      callGraphAPIPaginated.mockResolvedValue({ value: [mockEmails.basic] });

      await handleSearchEmails({ unreadOnly: true });

      const params = callGraphAPIPaginated.mock.calls[0][3];
      expect(params.$filter).toContain('isRead eq false');
    });

    test('should combine hasAttachments and unreadOnly filters with "and"', async () => {
      ensureAuthenticated.mockResolvedValue(MOCK_ACCESS_TOKEN);
      resolveFolderPath.mockResolvedValue('me/mailFolders/inbox/messages');
      callGraphAPIPaginated.mockResolvedValue({ value: [] });

      await handleSearchEmails({ hasAttachments: true, unreadOnly: true });

      const params = callGraphAPIPaginated.mock.calls[0][3];
      expect(params.$filter).toContain('hasAttachments eq true');
      expect(params.$filter).toContain('isRead eq false');
      expect(params.$filter).toContain(' and ');
    });
  });

  describe('fallback behaviour', () => {
    test('should fall back to recent emails when all strategies return empty', async () => {
      ensureAuthenticated.mockResolvedValue(MOCK_ACCESS_TOKEN);
      resolveFolderPath.mockResolvedValue('me/mailFolders/inbox/messages');
      // All calls return empty — progressiveSearch will eventually fall back
      callGraphAPIPaginated.mockResolvedValue({ value: [] });

      const result = await handleSearchEmails({ query: 'noresults' });

      expect(result.content[0].text).toContain('No emails found matching your search criteria');
      // progressiveSearch tried multiple strategies so callGraphAPIPaginated was called > 1 time
      expect(callGraphAPIPaginated.mock.calls.length).toBeGreaterThan(1);
    });

    test('should try per-term fallback when combined search throws', async () => {
      ensureAuthenticated.mockResolvedValue(MOCK_ACCESS_TOKEN);
      resolveFolderPath.mockResolvedValue('me/mailFolders/inbox/messages');
      // First call (combined search) throws; second (per-term) succeeds
      callGraphAPIPaginated
        .mockRejectedValueOnce(new Error('search syntax error'))
        .mockResolvedValue({ value: [mockEmails.basic] });

      const result = await handleSearchEmails({ query: 'meeting', subject: 'standup' });

      expect(result.content[0].text).toContain('Found 1 emails');
    });
  });

  describe('count parameter', () => {
    test('should default count to 10', async () => {
      ensureAuthenticated.mockResolvedValue(MOCK_ACCESS_TOKEN);
      resolveFolderPath.mockResolvedValue('me/mailFolders/inbox/messages');
      callGraphAPIPaginated.mockResolvedValue({ value: [mockEmails.basic] });

      await handleSearchEmails({ query: 'test' });

      const params = callGraphAPIPaginated.mock.calls[0][3];
      expect(params.$top).toBe(10);
    });

    test('should use custom count when provided', async () => {
      ensureAuthenticated.mockResolvedValue(MOCK_ACCESS_TOKEN);
      resolveFolderPath.mockResolvedValue('me/mailFolders/inbox/messages');
      callGraphAPIPaginated.mockResolvedValue({ value: [mockEmails.basic] });

      await handleSearchEmails({ query: 'test', count: 25 });

      const maxCount = callGraphAPIPaginated.mock.calls[0][4];
      expect(maxCount).toBe(25);
    });
  });

  describe('result formatting', () => {
    test('should include subject, sender, date and ID in output', async () => {
      ensureAuthenticated.mockResolvedValue(MOCK_ACCESS_TOKEN);
      resolveFolderPath.mockResolvedValue('me/mailFolders/inbox/messages');
      callGraphAPIPaginated.mockResolvedValue({ value: [mockEmails.basic] });

      const result = await handleSearchEmails({ query: 'test' });
      const text = result.content[0].text;

      expect(text).toContain('Test Email 1');
      expect(text).toContain('John Doe');
      expect(text).toContain('john@example.com');
      expect(text).toContain('email-1');
    });

    test('should mark unread emails with [UNREAD]', async () => {
      ensureAuthenticated.mockResolvedValue(MOCK_ACCESS_TOKEN);
      resolveFolderPath.mockResolvedValue('me/mailFolders/inbox/messages');
      callGraphAPIPaginated.mockResolvedValue({ value: [mockEmails.basic] }); // isRead: false

      const result = await handleSearchEmails({ query: 'test' });

      expect(result.content[0].text).toContain('[UNREAD]');
    });
  });
});
