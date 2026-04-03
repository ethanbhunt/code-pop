import { afterEach, describe, expect, it } from 'vitest';

import { getOrbitBaseUrl, orbitFetch } from './orbit-fetch';

describe('orbit-fetch', () => {
  const originalUrl = process.env.ORBITDB_API_URL;

  afterEach(() => {
    if (originalUrl === undefined) {
      delete process.env.ORBITDB_API_URL;
    } else {
      process.env.ORBITDB_API_URL = originalUrl;
    }
  });

  it('normalizes the configured base url', () => {
    process.env.ORBITDB_API_URL = 'http://example.test/api/';
    expect(getOrbitBaseUrl()).toBe('http://example.test/api');
  });

  it('throws when the orbit base url is missing', async () => {
    delete process.env.ORBITDB_API_URL;

    await expect(orbitFetch('token', '/users')).rejects.toThrow('ORBITDB_API_URL is not set');
  });
});
