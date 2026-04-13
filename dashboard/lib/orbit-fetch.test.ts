import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getOrbitBaseUrl, orbitFetch, orbitJson, orbitJsonPublic } from './orbit-fetch';

describe('orbit-fetch', () => {
  const originalUrl = process.env.ORBITDB_API_URL;
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

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

  it('adds auth and content-type headers for JSON requests', async () => {
    process.env.ORBITDB_API_URL = 'http://example.test/backend';
    fetchMock.mockResolvedValue({ ok: true, status: 200, text: async () => '{}' });

    await orbitFetch('abc123', 'users', { method: 'POST', body: JSON.stringify({ foo: 'bar' }) });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://example.test/backend/users');

    const headers = options.headers as Headers;
    expect(headers.get('Authorization')).toBe('Token abc123');
    expect(headers.get('Content-Type')).toBe('application/json');
  });

  it('returns parsed JSON data for successful orbitJson', async () => {
    process.env.ORBITDB_API_URL = 'http://example.test/backend';
    fetchMock.mockResolvedValue({ ok: true, status: 200, text: async () => '{"ok":true}' });

    await expect(orbitJson<{ ok: boolean }>('token', '/health')).resolves.toEqual({
      ok: true,
      status: 200,
      data: { ok: true },
    });
  });

  it('returns error response when public JSON is invalid', async () => {
    process.env.ORBITDB_API_URL = 'http://example.test/backend';
    fetchMock.mockResolvedValue({ ok: true, status: 200, text: async () => 'not-json' });

    await expect(orbitJsonPublic('/health')).resolves.toEqual({
      ok: false,
      status: 200,
      body: 'not-json',
    });
  });
});
