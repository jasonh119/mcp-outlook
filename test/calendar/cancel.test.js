const handleCancelEvent = require('../../calendar/cancel');
const { callGraphAPI } = require('../../utils/graph-api');
const { ensureAuthenticated } = require('../../auth');
const { MOCK_ACCESS_TOKEN, setupHandlerMocks, teardownHandlerMocks } = require('../helpers/mocks');

jest.mock('../../utils/graph-api');
jest.mock('../../auth');

describe('handleCancelEvent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupHandlerMocks();
  });

  afterEach(teardownHandlerMocks);

  describe('input validation', () => {
    test('should return error when no event ID provided', async () => {
      const result = await handleCancelEvent({});
      expect(result.content[0].text).toBe('Event ID is required to cancel an event.');
    });
  });

  describe('successful cancel', () => {
    test('should cancel event with default comment', async () => {
      ensureAuthenticated.mockResolvedValue(MOCK_ACCESS_TOKEN);
      callGraphAPI.mockResolvedValue({});

      const result = await handleCancelEvent({ eventId: 'event-1' });

      expect(callGraphAPI).toHaveBeenCalledWith(
        MOCK_ACCESS_TOKEN,
        'POST',
        'me/events/event-1/cancel',
        { comment: 'Cancelled via API' }
      );
      expect(result.content[0].text).toContain('successfully cancelled');
    });

    test('should cancel event with custom comment', async () => {
      ensureAuthenticated.mockResolvedValue(MOCK_ACCESS_TOKEN);
      callGraphAPI.mockResolvedValue({});

      await handleCancelEvent({ eventId: 'event-1', comment: 'No longer needed' });

      const payload = callGraphAPI.mock.calls[0][3];
      expect(payload.comment).toBe('No longer needed');
    });
  });

  describe('error handling', () => {
    test('should handle authentication error', async () => {
      ensureAuthenticated.mockRejectedValue(new Error('Authentication required'));

      const result = await handleCancelEvent({ eventId: 'event-1' });

      expect(result.content[0].text).toBe(
        "Authentication required. Please use the 'authenticate' tool first."
      );
    });

    test('should handle API error', async () => {
      ensureAuthenticated.mockResolvedValue(MOCK_ACCESS_TOKEN);
      callGraphAPI.mockRejectedValue(new Error('Cancel failed'));

      const result = await handleCancelEvent({ eventId: 'event-1' });

      expect(result.content[0].text).toBe('Error cancelling event: Cancel failed');
    });
  });
});
