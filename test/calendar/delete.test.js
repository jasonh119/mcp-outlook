const handleDeleteEvent = require('../../calendar/delete');
const { callGraphAPI } = require('../../utils/graph-api');
const { ensureAuthenticated } = require('../../auth');
const { MOCK_ACCESS_TOKEN, setupHandlerMocks, teardownHandlerMocks } = require('../helpers/mocks');

jest.mock('../../utils/graph-api');
jest.mock('../../auth');

describe('handleDeleteEvent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupHandlerMocks();
  });

  afterEach(teardownHandlerMocks);

  describe('input validation', () => {
    test('should return error when no event ID provided', async () => {
      const result = await handleDeleteEvent({});
      expect(result.content[0].text).toBe('Event ID is required to delete an event.');
    });
  });

  describe('successful deletion', () => {
    test('should delete event by ID', async () => {
      ensureAuthenticated.mockResolvedValue(MOCK_ACCESS_TOKEN);
      callGraphAPI.mockResolvedValue({});

      const result = await handleDeleteEvent({ eventId: 'event-1' });

      expect(callGraphAPI).toHaveBeenCalledWith(MOCK_ACCESS_TOKEN, 'DELETE', 'me/events/event-1');
      expect(result.content[0].text).toContain('successfully deleted');
    });
  });

  describe('error handling', () => {
    test('should handle authentication error', async () => {
      ensureAuthenticated.mockRejectedValue(new Error('Authentication required'));

      const result = await handleDeleteEvent({ eventId: 'event-1' });

      expect(result.content[0].text).toBe(
        "Authentication required. Please use the 'authenticate' tool first."
      );
    });

    test('should handle API error', async () => {
      ensureAuthenticated.mockResolvedValue(MOCK_ACCESS_TOKEN);
      callGraphAPI.mockRejectedValue(new Error('Not found'));

      const result = await handleDeleteEvent({ eventId: 'event-1' });

      expect(result.content[0].text).toBe('Error deleting event: Not found');
    });
  });
});
