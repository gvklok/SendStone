// ============================================================
// Final Phase Tests — App
// ============================================================

import { render, screen } from '@testing-library/react';
import App from '../App';

jest.mock('../supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: jest.fn().mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      }),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signInWithOAuth: jest.fn(),
      signOut: jest.fn(),
    },
  },
}));

global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ items: [], total: 0, page: 1 }),
  })
);

describe('App — Final Phase', () => {
  it('renders without crashing', () => {
    render(<App />);
  });

  it('renders the SendStone brand name', () => {
    render(<App />);
    expect(screen.getByText(/sendstone/i)).toBeInTheDocument();
  });

  it('renders an Explore navigation option', () => {
    render(<App />);
    expect(screen.getByText(/explore/i)).toBeInTheDocument();
  });
});
