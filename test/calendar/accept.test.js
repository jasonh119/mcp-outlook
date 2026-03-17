const handleAcceptEvent = require('../../calendar/accept');
const { callGraphAPI } = require('../../utils/graph-api');
const { ensureAuthenticated } = require('../../auth');
const { MOCK_ACCESS_TOKEN, setupHandlerMocks, teardownHandlerMocks } = require('../helpers/mocks');

jest.mock('../../utils/graph-api');
jest.mock('../../auth');

describe('handleAcceptEvent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupHandlerMocks();
  });

  afterEach(teardownHandlerMocks);

  describe('input validation', () => {
    test('should return error when no event ID provided', async () => {
      const result = await handleAcceptEvent({});
      expect(result.content[0].text).toBe('Event ID is required to accept an event.');
    });
  });

  describe('successful accept', () => {
    test('should accept event with default comment', async () => {
      ensureAuthenticated.mockResolvedValue(MOCK_ACCESS_TOKEN);
      callGraphAPI.mockResolvedValue({});

      const result = await handleAcceptEvent({ eventId: 'event-1' });

      expect(callGraphAPI).toHaveBeenCalledWith(
        MOCK_ACCESS_TOKEN,
        'POST',
        'me/events/event-1/accept',
        { comment: 'Accepted via API' }
      );
      expect(result.content[0].text).toContain('successfully accepted');
    });

    test('should accept event with custom comment', async () => {
      ensureAuthenticated.mockResolvedValue(MOCK_ACCESS_TOKEN);
      callGraphAPI.mockResolvedValue({});

      await handleAcceptEvent({ eventId: 'event-1', comment: 'See you there!' });

      expect(callGraphAPI).toHaveBeenCalledWith(
        MOCK_ACCESS_TOKEN,
        'POST',
        'me/events/event-1/accept',
        { comment: 'See you there!' }
      );
    });
  });

  describe('error handling', () => {
    test('should handle authentication error', async () => {
      ensureAuthenticated.mockRejectedValue(new Error('Authentication required'));

      const result = await handleAcceptEvent({ eventId: 'event-1' });

      expect(result.content[0].text).toBe(
        "Authentication required. Please use the 'authenticate' tool first."
      );
    });

    test('should handle API error', async () => {
      ensureAuthenticated.mockResolvedValue(MOCK_ACCESS_TOKEN);
      callGraphAPI.mockRejectedValue(new Error('Event not found'));

      const result = await handleAcceptEvent({ eventId: 'event-1' });

      expect(result.content[0].text).toBe('Error accepting event: Event not found');
    });
  });
});
