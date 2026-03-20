// ============================================================
// Final Phase Tests — NavigationButton
// ============================================================

import { render, screen, fireEvent } from '@testing-library/react';
import { Mountain, Compass, Bookmark } from 'lucide-react';
import NavigationButton from '../../../components/common/NavigationButton';

const setup = (overrides = {}) => {
  const props = {
    icon: Mountain,
    label: 'Explore',
    tabName: 'explore',
    activeTab: 'home',
    setActiveTab: jest.fn(),
    setMobileMenuOpen: jest.fn(),
    ...overrides,
  };
  return { ...render(<NavigationButton {...props} />), props };
};

describe('NavigationButton — Final Phase', () => {
  it('renders the label text', () => {
    setup();
    expect(screen.getByText('Explore')).toBeInTheDocument();
  });

  it('renders as a button element', () => {
    setup();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('calls setActiveTab with the correct tabName on click', () => {
    const setActiveTab = jest.fn();
    setup({ setActiveTab, tabName: 'explore' });
    fireEvent.click(screen.getByRole('button'));
    expect(setActiveTab).toHaveBeenCalledWith('explore');
  });

  it('calls setMobileMenuOpen(false) on click', () => {
    const setMobileMenuOpen = jest.fn();
    setup({ setMobileMenuOpen });
    fireEvent.click(screen.getByRole('button'));
    expect(setMobileMenuOpen).toHaveBeenCalledWith(false);
  });

  it('applies active text class when activeTab matches tabName', () => {
    setup({ activeTab: 'explore', tabName: 'explore' });
    expect(screen.getByRole('button')).toHaveClass('text-gray-900');
  });

  it('applies inactive text class when activeTab does not match tabName', () => {
    setup({ activeTab: 'home', tabName: 'explore' });
    expect(screen.getByRole('button')).toHaveClass('text-gray-500');
  });

  it('does not crash when setMobileMenuOpen is not provided', () => {
    const setActiveTab = jest.fn();
    render(
      <NavigationButton
        icon={Mountain}
        label="Tab"
        tabName="tab"
        activeTab="home"
        setActiveTab={setActiveTab}
      />
    );
    expect(() => fireEvent.click(screen.getByRole('button'))).not.toThrow();
    expect(setActiveTab).toHaveBeenCalledWith('tab');
  });

  it('renders correctly with a different icon', () => {
    setup({ icon: Compass, label: 'Create' });
    expect(screen.getByText('Create')).toBeInTheDocument();
  });

  it('renders correctly with different tab values', () => {
    const setActiveTab = jest.fn();
    setup({ icon: Bookmark, label: 'Saved', tabName: 'saved', setActiveTab });
    fireEvent.click(screen.getByRole('button'));
    expect(setActiveTab).toHaveBeenCalledWith('saved');
  });
});
