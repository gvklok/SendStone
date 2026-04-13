// ============================================================
// Final Phase Tests — AuthModal
// ============================================================

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AuthModal from '../../../components/common/AuthModal';

jest.mock('../../../supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signInWithOAuth: jest.fn(),
    },
  },
}));

global.fetch = jest.fn();

import { supabase } from '../../../supabaseClient';

const defaultProps = {
  open: true,
  onClose: jest.fn(),
  onAuthenticated: jest.fn(),
  targetTab: 'explore',
  externalError: null,
};

describe('AuthModal — Final Phase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
  });

  // --- Visibility ---

  it('renders nothing when open is false', () => {
    const { container } = render(<AuthModal {...defaultProps} open={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the modal when open is true', () => {
    render(<AuthModal {...defaultProps} />);
    expect(screen.getByPlaceholderText('email')).toBeInTheDocument();
  });

  // --- Mode switching ---

  it('shows login form by default', () => {
    render(<AuthModal {...defaultProps} />);
    expect(screen.getByPlaceholderText('email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
  });

  it('switches to create account mode when tab is clicked', () => {
    render(<AuthModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Create Account'));
    expect(screen.getByPlaceholderText('Full name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. climber123')).toBeInTheDocument();
  });

  it('shows the climbing level dropdown in create mode', () => {
    render(<AuthModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Create Account'));
    expect(screen.getByText('Beginner')).toBeInTheDocument();
  });

  // --- Close button ---

  it('calls onClose when the ✕ button is clicked', () => {
    const onClose = jest.fn();
    render(<AuthModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('✕'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // --- Validation errors ---

  it('shows error when submitting with empty email and password', async () => {
    render(<AuthModal {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /^login$/i }));
    await waitFor(() => {
      expect(screen.getByText('Enter an email and password.')).toBeInTheDocument();
    });
  });

  it('shows error in create mode when name and username are missing', async () => {
    render(<AuthModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Create Account'));
    await userEvent.type(screen.getByPlaceholderText('email'), 'user@test.com');
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'password123');
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    await waitFor(() => {
      expect(screen.getByText('Add your name and username.')).toBeInTheDocument();
    });
  });

  it('displays the externalError prop', () => {
    render(<AuthModal {...defaultProps} externalError="Session expired" />);
    expect(screen.getByText('Session expired')).toBeInTheDocument();
  });

  // --- Supabase login flow ---

  it('calls signInWithPassword with correct credentials', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: {
        user: { id: 'uid-1', email: 'test@test.com', user_metadata: {} },
      },
      error: null,
    });

    render(<AuthModal {...defaultProps} />);
    await userEvent.type(screen.getByPlaceholderText('email'), 'test@test.com');
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'password123');
    fireEvent.click(screen.getByRole('button', { name: /^login$/i }));

    await waitFor(() => {
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@test.com',
        password: 'password123',
      });
    });
  });

  it('displays the supabase error message on a failed login', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid login credentials' },
    });

    render(<AuthModal {...defaultProps} />);
    await userEvent.type(screen.getByPlaceholderText('email'), 'bad@test.com');
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'wrongpass');
    fireEvent.click(screen.getByRole('button', { name: /^login$/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid login credentials')).toBeInTheDocument();
    });
  });

  it('calls onAuthenticated after a successful login', async () => {
    const onAuthenticated = jest.fn();
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: {
        user: { id: 'uid-1', email: 'test@test.com', user_metadata: {} },
      },
      error: null,
    });

    render(<AuthModal {...defaultProps} onAuthenticated={onAuthenticated} />);
    await userEvent.type(screen.getByPlaceholderText('email'), 'test@test.com');
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'password123');
    fireEvent.click(screen.getByRole('button', { name: /^login$/i }));

    await waitFor(() => {
      expect(onAuthenticated).toHaveBeenCalledTimes(1);
    });
  });

  // --- Form reset ---

  it('resets all fields when modal is reopened', () => {
    const { rerender } = render(<AuthModal {...defaultProps} open={false} />);
    rerender(<AuthModal {...defaultProps} open={true} />);
    expect(screen.getByPlaceholderText('email')).toHaveValue('');
    expect(screen.getByPlaceholderText('••••••••')).toHaveValue('');
  });

  // --- Target tab label ---

  it('shows the target tab label inside the form', () => {
    render(<AuthModal {...defaultProps} targetTab="create" />);
    expect(screen.getByText(/login to access create/i)).toBeInTheDocument();
  });
});
