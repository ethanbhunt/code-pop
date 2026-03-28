import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import LoginPage from './page';

const pushMock = vi.fn();
const refreshMock = vi.fn();
const signInMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
  useSearchParams: () => ({ get: () => '/' }),
}));

vi.mock('next-auth/react', () => ({
  signIn: (...args: unknown[]) => signInMock(...args),
}));

describe('LoginPage', () => {
  beforeEach(() => {
    pushMock.mockReset();
    refreshMock.mockReset();
    signInMock.mockReset();
  });

  it('shows error when sign-in fails', async () => {
    signInMock.mockResolvedValue({ error: 'CredentialsSignin' });

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText('Username'), {
      target: { value: 'bad-user' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'bad-pass' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid username or password.');
    });
  });

  it('navigates to callback url when sign-in succeeds', async () => {
    signInMock.mockResolvedValue({ ok: true });

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText('Username'), {
      target: { value: 'good-user' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'good-pass' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/');
      expect(refreshMock).toHaveBeenCalled();
    });
  });
});
