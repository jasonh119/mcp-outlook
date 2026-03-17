const { handleListRules } = require('../../rules/list');
const { callGraphAPI } = require('../../utils/graph-api');
const { ensureAuthenticated } = require('../../auth');
const { MOCK_ACCESS_TOKEN, mockRules, setupHandlerMocks, teardownHandlerMocks } = require('../helpers/mocks');

jest.mock('../../utils/graph-api');
jest.mock('../../auth');

describe('handleListRules', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupHandlerMocks();
  });

  afterEach(teardownHandlerMocks);

  describe('successful listing', () => {
    test('should list rules in simple format by default', async () => {
      ensureAuthenticated.mockResolvedValue(MOCK_ACCESS_TOKEN);
      callGraphAPI.mockResolvedValue({ value: [mockRules.basic, mockRules.disabled] });

      const result = await handleListRules({});

      expect(result.content[0].text).toContain('Found 2 inbox rules');
      expect(result.content[0].text).toContain('Move newsletters');
      expect(result.content[0].text).toContain('Archive old emails');
      expect(result.content[0].text).toContain('(Disabled)');
    });

    test('should list rules with details when requested', async () => {
      ensureAuthenticated.mockResolvedValue(MOCK_ACCESS_TOKEN);
      callGraphAPI.mockResolvedValue({ value: [mockRules.basic] });

      const result = await handleListRules({ includeDetails: true });

      expect(result.content[0].text).toContain('Conditions:');
      expect(result.content[0].text).toContain('Actions:');
      expect(result.content[0].text).toContain('newsletter@example.com');
      expect(result.content[0].text).toContain('Mark as read');
    });

    test('should return message when no rules found', async () => {
      ensureAuthenticated.mockResolvedValue(MOCK_ACCESS_TOKEN);
      callGraphAPI.mockResolvedValue({ value: [] });

      const result = await handleListRules({});

      expect(result.content[0].text).toContain('No inbox rules found');
    });
  });

  describe('error handling', () => {
    test('should handle authentication error', async () => {
      ensureAuthenticated.mockRejectedValue(new Error('Authentication required'));

      const result = await handleListRules({});

      expect(result.content[0].text).toBe(
        "Authentication required. Please use the 'authenticate' tool first."
      );
    });

    test('should handle API error', async () => {
      ensureAuthenticated.mockResolvedValue(MOCK_ACCESS_TOKEN);
      callGraphAPI.mockRejectedValue(new Error('Rules API Error'));

      const result = await handleListRules({});

      expect(result.content[0].text).toBe('Error listing rules: Rules API Error');
    });
  });
});
