const handleListEvents = require('../../calendar/list');
const { callGraphAPI } = require('../../utils/graph-api');
const { ensureAuthenticated } = require('../../auth');
const { MOCK_ACCESS_TOKEN, mockEvents, setupHandlerMocks, teardownHandlerMocks } = require('../helpers/mocks');

jest.mock('../../utils/graph-api');
jest.mock('../../auth');

describe('handleListEvents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupHandlerMocks();
  });

  afterEach(teardownHandlerMocks);

  describe('successful listing', () => {
    test('should list upcoming events', async () => {
      ensureAuthenticated.mockResolvedValue(MOCK_ACCESS_TOKEN);
      callGraphAPI.mockResolvedValue({ value: [mockEvents.basic] });

      const result = await handleListEvents({});

      expect(ensureAuthenticated).toHaveBeenCalledTimes(1);
      expect(callGraphAPI).toHaveBeenCalledWith(
        MOCK_ACCESS_TOKEN,
        'GET',
        'me/calendarView',
        null,
        expect.objectContaining({
          $top: 10,
          $orderby: 'start/dateTime',
          startDateTime: expect.any(String),
          endDateTime: expect.any(String)
        })
      );
      expect(result.content[0].text).toContain('Found 1 events');
      expect(result.content[0].text).toContain('Team Meeting');
    });

    test('should respect custom count', async () => {
      ensureAuthenticated.mockResolvedValue(MOCK_ACCESS_TOKEN);
      callGraphAPI.mockResolvedValue({ value: [mockEvents.basic] });

      await handleListEvents({ count: 5 });

      expect(callGraphAPI).toHaveBeenCalledWith(
        MOCK_ACCESS_TOKEN,
        'GET',
        'me/calendarView',
        null,
        expect.objectContaining({ $top: 5 })
      );
    });

    test('should cap count at MAX_RESULT_COUNT', async () => {
      ensureAuthenticated.mockResolvedValue(MOCK_ACCESS_TOKEN);
      callGraphAPI.mockResolvedValue({ value: [] });

      await handleListEvents({ count: 999 });

      expect(callGraphAPI).toHaveBeenCalledWith(
        MOCK_ACCESS_TOKEN,
        'GET',
        'me/calendarView',
        null,
        expect.objectContaining({ $top: 50 })
      );
    });

    test('should return message when no events found', async () => {
      ensureAuthenticated.mockResolvedValue(MOCK_ACCESS_TOKEN);
      callGraphAPI.mockResolvedValue({ value: [] });

      const result = await handleListEvents({});

      expect(result.content[0].text).toBe('No calendar events found.');
    });
  });

  describe('error handling', () => {
    test('should handle authentication error', async () => {
      ensureAuthenticated.mockRejectedValue(new Error('Authentication required'));

      const result = await handleListEvents({});

      expect(result.content[0].text).toBe(
        "Authentication required. Please use the 'authenticate' tool first."
      );
    });

    test('should handle API error', async () => {
      ensureAuthenticated.mockResolvedValue(MOCK_ACCESS_TOKEN);
      callGraphAPI.mockRejectedValue(new Error('Calendar API Error'));

      const result = await handleListEvents({});

      expect(result.content[0].text).toBe('Error listing events: Calendar API Error');
    });
  });
});
