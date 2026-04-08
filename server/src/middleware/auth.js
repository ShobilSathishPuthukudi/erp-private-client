import { verifyToken, roleGuard } from './verifyToken.js';

/**
 * Institutional Authentication Bridge (GAP-4)
 * Synchronizes legacy 'authenticate' and 'authorize' definitions
 * with the established 'verifyToken' and 'roleGuard' engines.
 */
export const authenticate = verifyToken;
export const authorize = roleGuard;
