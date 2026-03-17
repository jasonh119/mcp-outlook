/**
 * Tests for utils/graph-api.js
 * Uses the real callGraphAPI/callGraphAPIPaginated by mocking the underlying https module
 * and the config module.
 */
const https = require('https');
const { EventEmitter } = require('events');

jest.mock('https');
jest.mock('../../config', () => ({
  USE_TEST_MODE: false,
  GRAPH_API_ENDPOINT: 'https://graph.microsoft.com/v1.0/'
}));
jest.mock('../../utils/mock-data');

const { callGraphAPI, callGraphAPIPaginated } = require('../../utils/graph-api');

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  console.error.mockRestore();
});

// Helper to create a fake https response
function makeResponse(statusCode, body) {
  const res = new EventEmitter();
  res.statusCode = statusCode;
  process.nextTick(() => {
    res.emit('data', JSON.stringify(body));
    res.emit('end');
  });
  return res;
}

function mockHttpsRequest(statusCode, body) {
  const req = new EventEmitter();
  req.write = jest.fn();
  req.end = jest.fn();
  https.request.mockImplementation((_url, _opts, cb) => {
    cb(makeResponse(statusCode, body));
    return req;
  });
  return req;
}

describe('callGraphAPI', () => {
  test('should build URL from path and queryParams and send Authorization header', async () => {
    mockHttpsRequest(200, { value: [] });

    await callGraphAPI('token123', 'GET', 'me/messages', null, { $top: '5' });

    const [url, options] = https.request.mock.calls[0];
    expect(url).toContain('https://graph.microsoft.com/v1.0/me/messages');
    // URLSearchParams encodes $ as %24
    expect(url).toContain('%24top=5');
    expect(options.headers['Authorization']).toBe('Bearer token123');
  });

  test('should handle $filter param with URI encoding', async () => {
    mockHttpsRequest(200, {});

    await callGraphAPI('tok', 'GET', 'me/messages', null, {
      $filter: "from/emailAddress/address eq 'test@example.com'"
    });

    const [url] = https.request.mock.calls[0];
    // $filter key is appended directly (not via URLSearchParams), so it is NOT percent-encoded
    expect(url).toContain('$filter=');
    expect(url).toContain(encodeURIComponent("from/emailAddress/address eq 'test@example.com'"));
  });

  test('should use full URL directly when path starts with https://', async () => {
    mockHttpsRequest(200, { value: [] });
    const nextLink = 'https://graph.microsoft.com/v1.0/me/messages?$skiptoken=abc123';

    await callGraphAPI('tok', 'GET', nextLink, null, {});

    const [url] = https.request.mock.calls[0];
    expect(url).toBe(nextLink);
  });

  test('should parse and resolve JSON on 2xx response', async () => {
    const body = { id: 'event-1', subject: 'Test' };
    mockHttpsRequest(200, body);

    const result = await callGraphAPI('tok', 'GET', 'me/events/event-1');

    expect(result).toEqual(body);
  });

  test('should resolve with {} when response body is empty', async () => {
    const req = new EventEmitter();
    req.write = jest.fn();
    req.end = jest.fn();
    https.request.mockImplementation((_url, _opts, cb) => {
      const res = new EventEmitter();
      res.statusCode = 204;
      process.nextTick(() => {
        res.emit('data', '');
        res.emit('end');
      });
      cb(res);
      return req;
    });

    const result = await callGraphAPI('tok', 'DELETE', 'me/messages/xyz');

    expect(result).toEqual({});
  });

  test('should throw UNAUTHORIZED on 401', async () => {
    const req = new EventEmitter();
    req.write = jest.fn();
    req.end = jest.fn();
    https.request.mockImplementation((_url, _opts, cb) => {
      const res = new EventEmitter();
      res.statusCode = 401;
      process.nextTick(() => {
        res.emit('data', 'Unauthorized');
        res.emit('end');
      });
      cb(res);
      return req;
    });

    await expect(callGraphAPI('expired', 'GET', 'me/messages')).rejects.toThrow('UNAUTHORIZED');
  });

  test('should throw descriptive error on non-2xx non-401', async () => {
    const req = new EventEmitter();
    req.write = jest.fn();
    req.end = jest.fn();
    https.request.mockImplementation((_url, _opts, cb) => {
      const res = new EventEmitter();
      res.statusCode = 404;
      process.nextTick(() => {
        res.emit('data', 'Not Found');
        res.emit('end');
      });
      cb(res);
      return req;
    });

    await expect(callGraphAPI('tok', 'GET', 'me/messages/bad-id')).rejects.toThrow('404');
  });

  test('should throw network error on request error event', async () => {
    const req = new EventEmitter();
    req.write = jest.fn();
    req.end = jest.fn();
    https.request.mockImplementation(() => {
      process.nextTick(() => req.emit('error', new Error('ECONNREFUSED')));
      return req;
    });

    await expect(callGraphAPI('tok', 'GET', 'me/messages')).rejects.toThrow('Network error during API call');
  });

  test('should write body for POST requests', async () => {
    const req = mockHttpsRequest(201, { id: 'new-event' });

    await callGraphAPI('tok', 'POST', 'me/events', { subject: 'Meeting' });

    expect(req.write).toHaveBeenCalledWith(JSON.stringify({ subject: 'Meeting' }));
  });

  test('should NOT write body for GET requests', async () => {
    const req = mockHttpsRequest(200, { value: [] });

    await callGraphAPI('tok', 'GET', 'me/events', null);

    expect(req.write).not.toHaveBeenCalled();
  });

  test('should route to mock data in test mode when token starts with test_access_token_', async () => {
    const config = require('../../config');
    const mockData = require('../../utils/mock-data');
    mockData.simulateGraphAPIResponse = jest.fn().mockResolvedValue({ value: [] });
    config.USE_TEST_MODE = true;

    try {
      await callGraphAPI('test_access_token_12345', 'GET', 'me/messages');

      expect(mockData.simulateGraphAPIResponse).toHaveBeenCalledWith('GET', 'me/messages', null, {});
      expect(https.request).not.toHaveBeenCalled();
    } finally {
      config.USE_TEST_MODE = false;
    }
  });
});

describe('callGraphAPIPaginated', () => {
  test('should return items from a single page when no nextLink', async () => {
    mockHttpsRequest(200, { value: [{ id: '1' }, { id: '2' }] });

    const result = await callGraphAPIPaginated('tok', 'GET', 'me/messages', {});

    expect(result.value).toHaveLength(2);
    expect(https.request).toHaveBeenCalledTimes(1);
  });

  test('should follow @odata.nextLink to get second page', async () => {
    const nextLink = 'https://graph.microsoft.com/v1.0/me/messages?$skiptoken=page2';
    let callCount = 0;
    https.request.mockImplementation((_url, _opts, cb) => {
      callCount++;
      const body = callCount === 1
        ? { value: [{ id: '1' }], '@odata.nextLink': nextLink }
        : { value: [{ id: '2' }] };
      cb(makeResponse(200, body));
      const req = new EventEmitter();
      req.write = jest.fn();
      req.end = jest.fn();
      return req;
    });

    const result = await callGraphAPIPaginated('tok', 'GET', 'me/messages', {});

    expect(result.value).toHaveLength(2);
    expect(https.request).toHaveBeenCalledTimes(2);
    // Second call should use the nextLink URL directly
    const secondCallUrl = https.request.mock.calls[1][0];
    expect(secondCallUrl).toBe(nextLink);
  });

  test('should stop and trim results when maxCount is reached', async () => {
    const items = Array.from({ length: 10 }, (_, i) => ({ id: String(i) }));
    mockHttpsRequest(200, { value: items });

    const result = await callGraphAPIPaginated('tok', 'GET', 'me/messages', {}, 3);

    expect(result.value).toHaveLength(3);
  });

  test('should return all items when maxCount is 0', async () => {
    const items = Array.from({ length: 10 }, (_, i) => ({ id: String(i) }));
    mockHttpsRequest(200, { value: items });

    const result = await callGraphAPIPaginated('tok', 'GET', 'me/messages', {}, 0);

    expect(result.value).toHaveLength(10);
  });

  test('should throw when method is not GET', async () => {
    await expect(
      callGraphAPIPaginated('tok', 'POST', 'me/messages', {})
    ).rejects.toThrow('Pagination only supports GET requests');
  });

  test('should propagate errors from callGraphAPI', async () => {
    const req = new EventEmitter();
    req.write = jest.fn();
    req.end = jest.fn();
    https.request.mockImplementation((_url, _opts, cb) => {
      const res = new EventEmitter();
      res.statusCode = 401;
      process.nextTick(() => {
        res.emit('data', '');
        res.emit('end');
      });
      cb(res);
      return req;
    });

    await expect(
      callGraphAPIPaginated('tok', 'GET', 'me/messages', {})
    ).rejects.toThrow('UNAUTHORIZED');
  });
});
