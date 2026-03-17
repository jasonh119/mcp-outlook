const handleCreateEvent = require('../../calendar/create');
const { DEFAULT_TIMEZONE } = require('../../config');
const { callGraphAPI } = require('../../utils/graph-api');
const { ensureAuthenticated } = require('../../auth');

jest.mock('../../utils/graph-api');
jest.mock('../../auth');

describe('handleCreateEvent', () => {
  beforeEach(() => {
    // Reset mocks before each test
    callGraphAPI.mockClear();
    ensureAuthenticated.mockClear();
  });

  test('should use default timezone when no timezone is provided', async () => {
    ensureAuthenticated.mockResolvedValue('dummy_access_token');
    callGraphAPI.mockResolvedValue({ id: 'test_event_id' });

    const args = {
      subject: 'Test Event',
      start: '2024-03-10T10:00:00',
      end: '2024-03-10T11:00:00',
    };

    await handleCreateEvent(args);

    expect(ensureAuthenticated).toHaveBeenCalledTimes(1);
    expect(callGraphAPI).toHaveBeenCalledTimes(1);
    const callGraphAPIArgs = callGraphAPI.mock.calls[0][3]; // bodyContent is the 4th argument
    expect(callGraphAPIArgs.start.timeZone).toBe(DEFAULT_TIMEZONE);
    expect(callGraphAPIArgs.end.timeZone).toBe(DEFAULT_TIMEZONE);
  });

  test('should use specified timezone when provided', async () => {
    ensureAuthenticated.mockResolvedValue('dummy_access_token');
    callGraphAPI.mockResolvedValue({ id: 'test_event_id' });

    const specifiedTimeZone = 'Pacific Standard Time';
    const args = {
      subject: 'Test Event with Specific Timezone',
      start: { dateTime: '2024-03-10T10:00:00', timeZone: specifiedTimeZone },
      end: { dateTime: '2024-03-10T11:00:00', timeZone: specifiedTimeZone },
    };

    await handleCreateEvent(args);

    expect(ensureAuthenticated).toHaveBeenCalledTimes(1);
    expect(callGraphAPI).toHaveBeenCalledTimes(1);
    const callGraphAPIArgs = callGraphAPI.mock.calls[0][3]; // bodyContent is the 4th argument
    expect(callGraphAPIArgs.start.timeZone).toBe(specifiedTimeZone);
    expect(callGraphAPIArgs.end.timeZone).toBe(specifiedTimeZone);
  });

  test('should use default timezone if only start timezone is provided', async () => {
    ensureAuthenticated.mockResolvedValue('dummy_access_token');
    callGraphAPI.mockResolvedValue({ id: 'test_event_id' });

    const specifiedTimeZone = 'Pacific Standard Time';
    const args = {
        subject: 'Test Event with Specific Start Timezone',
        start: { dateTime: '2024-03-10T10:00:00', timeZone: specifiedTimeZone },
        end: { dateTime: '2024-03-10T11:00:00' }, // No timezone for end
    };

    await handleCreateEvent(args);

    expect(ensureAuthenticated).toHaveBeenCalledTimes(1);
    expect(callGraphAPI).toHaveBeenCalledTimes(1);
    const callGraphAPIArgs = callGraphAPI.mock.calls[0][3];
    expect(callGraphAPIArgs.start.timeZone).toBe(specifiedTimeZone);
    expect(callGraphAPIArgs.end.timeZone).toBe(DEFAULT_TIMEZONE);
  });

  test('should use default timezone if only end timezone is provided', async () => {
    ensureAuthenticated.mockResolvedValue('dummy_access_token');
    callGraphAPI.mockResolvedValue({ id: 'test_event_id' });

    const specifiedTimeZone = 'Pacific Standard Time';
    const args = {
        subject: 'Test Event with Specific End Timezone',
        start: { dateTime: '2024-03-10T10:00:00' }, // No timezone for start
        end: { dateTime: '2024-03-10T11:00:00', timeZone: specifiedTimeZone },
    };

    await handleCreateEvent(args);

    expect(ensureAuthenticated).toHaveBeenCalledTimes(1);
    expect(callGraphAPI).toHaveBeenCalledTimes(1);
    const callGraphAPIArgs = callGraphAPI.mock.calls[0][3];
    expect(callGraphAPIArgs.start.timeZone).toBe(DEFAULT_TIMEZONE);
    expect(callGraphAPIArgs.end.timeZone).toBe(specifiedTimeZone);
  });

  test('should return error if subject is missing', async () => {
    const args = {
      start: '2024-03-10T10:00:00',
      end: '2024-03-10T11:00:00',
    };

    const result = await handleCreateEvent(args);
    expect(result.content[0].text).toBe("Subject, start, and end times are required to create an event.");
    expect(ensureAuthenticated).not.toHaveBeenCalled();
    expect(callGraphAPI).not.toHaveBeenCalled();
  });

  test('should return error if start is missing', async () => {
    const args = {
      subject: 'Test Event',
      end: '2024-03-10T11:00:00',
    };

    const result = await handleCreateEvent(args);
    expect(result.content[0].text).toBe("Subject, start, and end times are required to create an event.");
    expect(ensureAuthenticated).not.toHaveBeenCalled();
    expect(callGraphAPI).not.toHaveBeenCalled();
  });

  test('should return error if end is missing', async () => {
    const args = {
      subject: 'Test Event',
      start: '2024-03-10T10:00:00',
    };

    const result = await handleCreateEvent(args);
    expect(result.content[0].text).toBe("Subject, start, and end times are required to create an event.");
    expect(ensureAuthenticated).not.toHaveBeenCalled();
    expect(callGraphAPI).not.toHaveBeenCalled();
  });

   test('should handle authentication error', async () => {
    ensureAuthenticated.mockRejectedValue(new Error('Authentication required'));
    const args = {
      subject: 'Test Event',
      start: '2024-03-10T10:00:00',
      end: '2024-03-10T11:00:00',
    };

    const result = await handleCreateEvent(args);
    expect(result.content[0].text).toBe("Authentication required. Please use the 'authenticate' tool first.");
    expect(callGraphAPI).not.toHaveBeenCalled();
  });

  test('should handle Graph API call error', async () => {
    ensureAuthenticated.mockResolvedValue('dummy_access_token');
    callGraphAPI.mockRejectedValue(new Error('Graph API Error'));
     const args = {
      subject: 'Test Event',
      start: '2024-03-10T10:00:00',
      end: '2024-03-10T11:00:00',
    };

    const result = await handleCreateEvent(args);
    expect(result.content[0].text).toBe("Error creating event: Graph API Error");
  });

  test('should map attendees array to Graph API format', async () => {
    ensureAuthenticated.mockResolvedValue('dummy_access_token');
    callGraphAPI.mockResolvedValue({ id: 'event-1' });

    await handleCreateEvent({
      subject: 'Team Meeting',
      start: '2024-03-10T10:00:00',
      end: '2024-03-10T11:00:00',
      attendees: ['alice@example.com', 'bob@example.com']
    });

    const bodyContent = callGraphAPI.mock.calls[0][3];
    expect(bodyContent.attendees).toEqual([
      { emailAddress: { address: 'alice@example.com' }, type: 'required' },
      { emailAddress: { address: 'bob@example.com' }, type: 'required' }
    ]);
  });

  test('should send body as HTML contentType', async () => {
    ensureAuthenticated.mockResolvedValue('dummy_access_token');
    callGraphAPI.mockResolvedValue({ id: 'event-1' });

    await handleCreateEvent({
      subject: 'Event with Body',
      start: '2024-03-10T10:00:00',
      end: '2024-03-10T11:00:00',
      body: '<p>Agenda here</p>'
    });

    const bodyContent = callGraphAPI.mock.calls[0][3];
    expect(bodyContent.body).toEqual({ contentType: 'HTML', content: '<p>Agenda here</p>' });
  });

  test('should send empty string body content when body is omitted', async () => {
    ensureAuthenticated.mockResolvedValue('dummy_access_token');
    callGraphAPI.mockResolvedValue({ id: 'event-1' });

    await handleCreateEvent({
      subject: 'No Body Event',
      start: '2024-03-10T10:00:00',
      end: '2024-03-10T11:00:00'
    });

    const bodyContent = callGraphAPI.mock.calls[0][3];
    expect(bodyContent.body).toEqual({ contentType: 'HTML', content: '' });
  });

  test('should use me/events endpoint', async () => {
    ensureAuthenticated.mockResolvedValue('dummy_access_token');
    callGraphAPI.mockResolvedValue({ id: 'event-1' });

    await handleCreateEvent({
      subject: 'Endpoint Test',
      start: '2024-03-10T10:00:00',
      end: '2024-03-10T11:00:00'
    });

    const endpoint = callGraphAPI.mock.calls[0][2];
    expect(endpoint).toBe('me/events');
  });

  test('should include subject in success response message', async () => {
    ensureAuthenticated.mockResolvedValue('dummy_access_token');
    callGraphAPI.mockResolvedValue({ id: 'event-1' });

    const result = await handleCreateEvent({
      subject: 'My Important Event',
      start: '2024-03-10T10:00:00',
      end: '2024-03-10T11:00:00'
    });

    expect(result.content[0].text).toContain('My Important Event');
  });

});
