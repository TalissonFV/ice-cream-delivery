import { signToken, validateToken } from '../../src/services/authService';

describe('authService', () => {
  const mockUser = { id: 1, email: 'user@example.com', role: 'user' };

  test('signToken returns a valid JWT string and validateToken decodes it', () => {
    const token = signToken(mockUser);
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);

    const decoded = validateToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.id).toBe(mockUser.id);
    expect(decoded?.email).toBe(mockUser.email);
    expect(decoded?.role).toBe(mockUser.role);
  });

  test('validateToken returns null for invalid token', () => {
    const result = validateToken('invalid.token.here');
    expect(result).toBeNull();
  });

  test('validateToken returns null for tampered token', () => {
    const token = signToken(mockUser);
    const tamperedToken = token.slice(0, -5) + 'xxxxx';
    const result = validateToken(tamperedToken);
    expect(result).toBeNull();
  });
});
