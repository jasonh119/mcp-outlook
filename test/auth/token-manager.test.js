// Token manager uses a module-level cache, so we need to isolate between tests.
// Re-require after resetModules to reset the cache, and re-require fs so all
// code under test shares the same mock instance.
let tokenManager;
let fs;

jest.mock('fs');
jest.mock('../../config', () => ({
  AUTH_CONFIG: {
    tokenStorePath: '/fake/home/.outlook-mcp-tokens.json'
  }
}));

const TOKEN_PATH = '/fake/home/.outlook-mcp-tokens.json';

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
  // Acquire references AFTER resetModules so both share the same mock registry
  fs = require('fs');
  tokenManager = require('../../auth/token-manager');
});

afterEach(() => {
  console.error.mockRestore();
});

describe('loadTokenCache', () => {
  test('should return null when token file does not exist', () => {
    fs.existsSync.mockReturnValue(false);

    const result = tokenManager.loadTokenCache();

    expect(result).toBeNull();
  });

  test('should return null when token has no access_token field', () => {
    fs.existsSync.mockReturnValue(true);
    fs.statSync.mockReturnValue({ size: 50, birthtime: new Date(), mtime: new Date() });
    fs.readFileSync.mockReturnValue(JSON.stringify({ refresh_token: 'abc' }));

    const result = tokenManager.loadTokenCache();

    expect(result).toBeNull();
  });

  test('should return null when token is expired', () => {
    const expiredTokens = {
      access_token: 'expired_token',
      expires_at: Date.now() - 1000 // 1 second in the past
    };
    fs.existsSync.mockReturnValue(true);
    fs.statSync.mockReturnValue({ size: 100, birthtime: new Date(), mtime: new Date() });
    fs.readFileSync.mockReturnValue(JSON.stringify(expiredTokens));

    const result = tokenManager.loadTokenCache();

    expect(result).toBeNull();
  });

  test('should return tokens and update in-memory cache when valid', () => {
    const validTokens = {
      access_token: 'valid_token',
      expires_at: Date.now() + 3600000
    };
    fs.existsSync.mockReturnValue(true);
    fs.statSync.mockReturnValue({ size: 100, birthtime: new Date(), mtime: new Date() });
    fs.readFileSync.mockReturnValue(JSON.stringify(validTokens));

    const result = tokenManager.loadTokenCache();

    expect(result).toMatchObject({ access_token: 'valid_token' });
  });

  test('should return null when JSON is invalid', () => {
    fs.existsSync.mockReturnValue(true);
    fs.statSync.mockReturnValue({ size: 10, birthtime: new Date(), mtime: new Date() });
    fs.readFileSync.mockReturnValue('not-json{{{');

    const result = tokenManager.loadTokenCache();

    expect(result).toBeNull();
  });
});

describe('saveTokenCache', () => {
  test('should write JSON to token file and update in-memory cache', () => {
    const tokens = { access_token: 'new_token', expires_at: Date.now() + 3600000 };
    fs.writeFileSync.mockImplementation(() => {});

    const result = tokenManager.saveTokenCache(tokens);

    expect(result).toBe(true);
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      TOKEN_PATH,
      JSON.stringify(tokens, null, 2),
      { mode: 0o600 }
    );
  });

  test('should return false when writeFileSync throws', () => {
    fs.writeFileSync.mockImplementation(() => { throw new Error('disk full'); });

    const result = tokenManager.saveTokenCache({ access_token: 'x' });

    expect(result).toBe(false);
  });
});

describe('getAccessToken', () => {
  test('should return token from in-memory cache without hitting the filesystem', () => {
    // Seed the in-memory cache via saveTokenCache
    const tokens = { access_token: 'cached_token', expires_at: Date.now() + 3600000 };
    fs.writeFileSync.mockImplementation(() => {});
    tokenManager.saveTokenCache(tokens);

    // Even if the file no longer exists, it should use the cache
    fs.existsSync.mockReturnValue(false);

    const token = tokenManager.getAccessToken();

    expect(token).toBe('cached_token');
    expect(fs.existsSync).not.toHaveBeenCalled();
  });

  test('should call loadTokenCache when in-memory cache is empty', () => {
    const validTokens = { access_token: 'file_token', expires_at: Date.now() + 3600000 };
    fs.existsSync.mockReturnValue(true);
    fs.statSync.mockReturnValue({ size: 100, birthtime: new Date(), mtime: new Date() });
    fs.readFileSync.mockReturnValue(JSON.stringify(validTokens));

    const token = tokenManager.getAccessToken();

    expect(token).toBe('file_token');
    expect(fs.existsSync).toHaveBeenCalled();
  });

  test('should return null when cache is empty and file does not exist', () => {
    fs.existsSync.mockReturnValue(false);

    const token = tokenManager.getAccessToken();

    expect(token).toBeNull();
  });
});

describe('createTestTokens', () => {
  test('should return tokens with test_access_token_ prefix and 1-hour expiry', () => {
    fs.writeFileSync.mockImplementation(() => {});
    const before = Date.now();

    const tokens = tokenManager.createTestTokens();

    const after = Date.now();
    expect(tokens.access_token).toMatch(/^test_access_token_/);
    expect(tokens.refresh_token).toMatch(/^test_refresh_token_/);
    expect(tokens.expires_at).toBeGreaterThanOrEqual(before + 3600000);
    expect(tokens.expires_at).toBeLessThanOrEqual(after + 3600000);
  });

  test('should persist tokens via saveTokenCache', () => {
    fs.writeFileSync.mockImplementation(() => {});

    tokenManager.createTestTokens();

    expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
  });
});
