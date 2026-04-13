// ============================================================
// Final Phase Tests — Header
// ============================================================

import { render, screen, fireEvent } from '@testing-library/react';
import Header from '../../../components/layout/Header';

describe('Header — Final Phase', () => {
  it('renders the SendStone brand name', () => {
    render(<Header mobileMenuOpen={false} setMobileMenuOpen={jest.fn()} />);
    expect(screen.getByText('SendStone')).toBeInTheDocument();
  });

  it('renders a toggle button', () => {
    render(<Header mobileMenuOpen={false} setMobileMenuOpen={jest.fn()} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('calls setMobileMenuOpen(true) when menu is closed and button is clicked', () => {
    const setMobileMenuOpen = jest.fn();
    render(<Header mobileMenuOpen={false} setMobileMenuOpen={setMobileMenuOpen} />);
    fireEvent.click(screen.getByRole('button'));
    expect(setMobileMenuOpen).toHaveBeenCalledWith(true);
  });

  it('calls setMobileMenuOpen(false) when menu is open and button is clicked', () => {
    const setMobileMenuOpen = jest.fn();
    render(<Header mobileMenuOpen={true} setMobileMenuOpen={setMobileMenuOpen} />);
    fireEvent.click(screen.getByRole('button'));
    expect(setMobileMenuOpen).toHaveBeenCalledWith(false);
  });

  it('toggles correctly across multiple clicks', () => {
    const setMobileMenuOpen = jest.fn();
    const { rerender } = render(
      <Header mobileMenuOpen={false} setMobileMenuOpen={setMobileMenuOpen} />
    );
    fireEvent.click(screen.getByRole('button'));
    expect(setMobileMenuOpen).toHaveBeenLastCalledWith(true);

    rerender(<Header mobileMenuOpen={true} setMobileMenuOpen={setMobileMenuOpen} />);
    fireEvent.click(screen.getByRole('button'));
    expect(setMobileMenuOpen).toHaveBeenLastCalledWith(false);
  });
});
