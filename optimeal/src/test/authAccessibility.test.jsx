/** @vitest-environment jsdom */
import React from 'react';
import axe from 'axe-core';
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, test, vi } from 'vitest';
import Login from '../components/auth/Login';

vi.mock('../components/auth/firebase', () => ({ auth: {}, provider: {} }));

afterEach(cleanup);

describe('authentication accessibility', () => {
  test('login exposes persistent labels and no detectable axe violations', async () => {
    const { container } = render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    expect(screen.getByLabelText('Email address')).toHaveAttribute('autocomplete', 'email');
    expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'current-password');
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeEnabled();

    const results = await axe.run(container, {
      rules: {
        'color-contrast': { enabled: false }
      }
    });

    expect(results.violations.map((violation) => violation.id)).toEqual([]);
  });
});
