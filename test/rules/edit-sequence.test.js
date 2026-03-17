/**
 * Tests for handleEditRuleSequence (defined inline in rules/index.js)
 */
const { callGraphAPI } = require('../../utils/graph-api');
const { ensureAuthenticated } = require('../../auth');
const { MOCK_ACCESS_TOKEN, mockRules, setupHandlerMocks, teardownHandlerMocks } = require('../helpers/mocks');

jest.mock('../../utils/graph-api');
jest.mock('../../auth');

const { handleEditRuleSequence } = require('../../rules');

describe('handleEditRuleSequence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupHandlerMocks();
  });

  afterEach(teardownHandlerMocks);

  describe('input validation', () => {
    test('should return error when no rule name provided', async () => {
      const result = await handleEditRuleSequence({ sequence: 5 });
      expect(result.content[0].text).toContain('Rule name is required');
    });

    test('should return error when no sequence provided', async () => {
      const result = await handleEditRuleSequence({ ruleName: 'Test' });
      expect(result.content[0].text).toContain('positive sequence number is required');
    });

    test('should return error when sequence is negative', async () => {
      const result = await handleEditRuleSequence({ ruleName: 'Test', sequence: -1 });
      expect(result.content[0].text).toContain('positive sequence number is required');
    });

    test('should return error when sequence is zero', async () => {
      const result = await handleEditRuleSequence({ ruleName: 'Test', sequence: 0 });
      expect(result.content[0].text).toContain('positive sequence number is required');
    });
  });

  describe('successful edit', () => {
    test('should update rule sequence', async () => {
      ensureAuthenticated.mockResolvedValue(MOCK_ACCESS_TOKEN);
      // getInboxRules call
      callGraphAPI
        .mockResolvedValueOnce({ value: [mockRules.basic] })
        .mockResolvedValueOnce({}); // PATCH call

      const result = await handleEditRuleSequence({
        ruleName: 'Move newsletters',
        sequence: 5
      });

      expect(result.content[0].text).toContain('Successfully updated');
      expect(result.content[0].text).toContain('5');
    });

    test('should return error when rule not found', async () => {
      ensureAuthenticated.mockResolvedValue(MOCK_ACCESS_TOKEN);
      callGraphAPI.mockResolvedValue({ value: [mockRules.basic] });

      const result = await handleEditRuleSequence({
        ruleName: 'Nonexistent Rule',
        sequence: 5
      });

      expect(result.content[0].text).toContain('not found');
    });
  });

  describe('error handling', () => {
    test('should handle authentication error', async () => {
      ensureAuthenticated.mockRejectedValue(new Error('Authentication required'));

      const result = await handleEditRuleSequence({ ruleName: 'Test', sequence: 5 });

      expect(result.content[0].text).toBe(
        "Authentication required. Please use the 'authenticate' tool first."
      );
    });
  });
});
