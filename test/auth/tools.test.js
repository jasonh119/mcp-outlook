const { handleAbout, handleAuthenticate, handleCheckAuthStatus } = require('../../auth/tools');
const config = require('../../config');
const tokenManager = require('../../auth/token-manager');

jest.mock('../../auth/token-manager');
jest.mock('../../config', () => ({
  SERVER_VERSION: '1.0.0',
  USE_TEST_MODE: false,
  AUTH_CONFIG: {
    clientId: 'test-client-id',
    authServerUrl: 'http://localhost:3333'
  }
}));

describe('handleAbout', () => {
  test('should return server version string', async () => {
    const result = await handleAbout();

    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toContain('1.0.0');
    expect(result.content[0].text).toContain('Outlook');
  });
});

describe('handleAuthenticate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  test('should call createTestTokens and return success in test mode', async () => {
    config.USE_TEST_MODE = true;
    tokenManager.createTestTokens.mockReturnValue({
      access_token: 'test_access_token_123',
      expires_at: Date.now() + 3600000
    });

    const result = await handleAuthenticate({});

    expect(tokenManager.createTestTokens).toHaveBeenCalledTimes(1);
    expect(result.content[0].text).toContain('test mode');

    config.USE_TEST_MODE = false;
  });

  test('should return auth URL containing clientId in real mode', async () => {
    config.USE_TEST_MODE = false;

    const result = await handleAuthenticate({});

    expect(result.content[0].text).toContain('test-client-id');
    expect(result.content[0].text).toContain('http://localhost:3333');
    expect(tokenManager.createTestTokens).not.toHaveBeenCalled();
  });

  test('should return auth URL when force flag is set in real mode', async () => {
    config.USE_TEST_MODE = false;

    const result = await handleAuthenticate({ force: true });

    expect(result.content[0].text).toContain('http://localhost:3333');
  });
});

describe('handleCheckAuthStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  test('should return "Not authenticated" when no tokens exist', async () => {
    tokenManager.loadTokenCache.mockReturnValue(null);

    const result = await handleCheckAuthStatus();

    expect(result.content[0].text).toBe('Not authenticated');
  });

  test('should return "Not authenticated" when tokens have no access_token', async () => {
    tokenManager.loadTokenCache.mockReturnValue({ refresh_token: 'abc' });

    const result = await handleCheckAuthStatus();

    expect(result.content[0].text).toBe('Not authenticated');
  });

  test('should return "Authenticated and ready" when valid token present', async () => {
    tokenManager.loadTokenCache.mockReturnValue({
      access_token: 'valid_token',
      expires_at: Date.now() + 3600000
    });

    const result = await handleCheckAuthStatus();

    expect(result.content[0].text).toBe('Authenticated and ready');
  });
});
