const { escapeODataString, buildODataFilter } = require('../../utils/odata-helpers');

beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  console.error.mockRestore();
});

describe('escapeODataString', () => {
  test('should replace single quotes with double single quotes', () => {
    expect(escapeODataString("O'Brien")).toBe("O''Brien");
  });

  test('should strip special characters that could break OData syntax', () => {
    const input = 'hello(world)';
    const result = escapeODataString(input);
    expect(result).not.toContain('(');
    expect(result).not.toContain(')');
    expect(result).toBe('helloworld');
  });

  test('should strip all defined special chars: (){}[]:;,/?&=+*%$#@!^', () => {
    const specials = '(){}[]:;,/?&=+*%$#@!^';
    const result = escapeODataString(specials);
    expect(result).toBe('');
  });

  test('should return string unchanged when no special characters present', () => {
    expect(escapeODataString('hello world')).toBe('hello world');
  });

  test('should return the input unchanged when value is falsy (null)', () => {
    expect(escapeODataString(null)).toBeNull();
  });

  test('should return the input unchanged when value is falsy (undefined)', () => {
    expect(escapeODataString(undefined)).toBeUndefined();
  });

  test('should return the input unchanged when value is empty string', () => {
    // empty string is falsy, returns as-is
    expect(escapeODataString('')).toBe('');
  });
});

describe('buildODataFilter', () => {
  test('should join multiple conditions with " and "', () => {
    const result = buildODataFilter(['isRead eq false', 'hasAttachments eq true']);
    expect(result).toBe('isRead eq false and hasAttachments eq true');
  });

  test('should return a single condition without " and "', () => {
    expect(buildODataFilter(['isRead eq false'])).toBe('isRead eq false');
  });

  test('should return empty string for an empty array', () => {
    expect(buildODataFilter([])).toBe('');
  });

  test('should return empty string for null', () => {
    expect(buildODataFilter(null)).toBe('');
  });

  test('should return empty string for undefined', () => {
    expect(buildODataFilter(undefined)).toBe('');
  });
});
