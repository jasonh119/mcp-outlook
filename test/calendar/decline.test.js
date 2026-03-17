const handleDeclineEvent = require('../../calendar/decline');
const { callGraphAPI } = require('../../utils/graph-api');
const { ensureAuthenticated } = require('../../auth');
const { MOCK_ACCESS_TOKEN, setupHandlerMocks, teardownHandlerMocks } = require('../helpers/mocks');

jest.mock('../../utils/graph-api');
jest.mock('../../auth');

describe('handleDeclineEvent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupHandlerMocks();
  });

  afterEach(teardownHandlerMocks);

  describe('input validation', () => {
    test('should return error when no event ID provided', async () => {
      const result = await handleDeclineEvent({});
      expect(result.content[0].text).toBe('Event ID is required to decline an event.');
    });
  });

  describe('successful decline', () => {
    test('should decline event with default comment', async () => {
      ensureAuthenticated.mockResolvedValue(MOCK_ACCESS_TOKEN);
      callGraphAPI.mockResolvedValue({});

      const result = await handleDeclineEvent({ eventId: 'event-1' });

      expect(callGraphAPI).toHaveBeenCalledWith(
        MOCK_ACCESS_TOKEN,
        'POST',
        'me/events/event-1/decline',
        { comment: 'Declined via API' }
      );
      expect(result.content[0].text).toContain('successfully declined');
    });

    test('should decline event with custom comment', async () => {
      ensureAuthenticated.mockResolvedValue(MOCK_ACCESS_TOKEN);
      callGraphAPI.mockResolvedValue({});

      await handleDeclineEvent({ eventId: 'event-1', comment: 'Conflicting meeting' });

      const payload = callGraphAPI.mock.calls[0][3];
      expect(payload.comment).toBe('Conflicting meeting');
    });
  });

  describe('error handling', () => {
    test('should handle authentication error', async () => {
      ensureAuthenticated.mockRejectedValue(new Error('Authentication required'));

      const result = await handleDeclineEvent({ eventId: 'event-1' });

      expect(result.content[0].text).toBe(
        "Authentication required. Please use the 'authenticate' tool first."
      );
    });

    test('should handle API error', async () => {
      ensureAuthenticated.mockResolvedValue(MOCK_ACCESS_TOKEN);
      callGraphAPI.mockRejectedValue(new Error('Decline failed'));

      const result = await handleDeclineEvent({ eventId: 'event-1' });

      expect(result.content[0].text).toBe('Error declining event: Decline failed');
    });
  });
});
