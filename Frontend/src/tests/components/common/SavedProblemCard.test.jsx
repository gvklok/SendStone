// ============================================================
// Final Phase Tests — SavedProblemCard
// ============================================================

import { render, screen, fireEvent } from '@testing-library/react';
import SavedProblemCard from '../../../components/common/SavedProblemCard';

jest.mock('../../../components/common/BoardPreview', () => () => (
  <div data-testid="board-preview" />
));

const defaultProps = {
  id: '1',
  grade: 'v4',
  savedDate: '2024-01-15',
  name: 'Test Route',
  holds: [],
  authorUsername: 'climber1',
  liked: false,
  saved: true,
  onHeart: jest.fn(),
  onBookmark: jest.fn(),
};

describe('SavedProblemCard — Final Phase', () => {
  beforeEach(() => jest.clearAllMocks());

  // --- Content rendering ---

  it('renders the route name', () => {
    render(<SavedProblemCard {...defaultProps} />);
    expect(screen.getByText('Test Route')).toBeInTheDocument();
  });

  it('falls back to Problem #id when name is not provided', () => {
    render(<SavedProblemCard {...defaultProps} name={null} />);
    expect(screen.getByText('Problem #1')).toBeInTheDocument();
  });

  it('renders the grade and saved date', () => {
    render(<SavedProblemCard {...defaultProps} />);
    expect(screen.getByText(/v4 · saved 2024-01-15/)).toBeInTheDocument();
  });

  it('renders the author username with @ prefix', () => {
    render(<SavedProblemCard {...defaultProps} />);
    expect(screen.getByText('@climber1')).toBeInTheDocument();
  });

  it('defaults author display to @climber when authorUsername is not provided', () => {
    render(<SavedProblemCard {...defaultProps} authorUsername={null} />);
    expect(screen.getByText('@climber')).toBeInTheDocument();
  });

  it('renders the board preview', () => {
    render(<SavedProblemCard {...defaultProps} />);
    expect(screen.getByTestId('board-preview')).toBeInTheDocument();
  });

  // --- Interactions ---

  it('calls onHeart when the ascent button is clicked', () => {
    const onHeart = jest.fn();
    render(<SavedProblemCard {...defaultProps} onHeart={onHeart} />);
    fireEvent.click(screen.getByRole('button', { name: /log ascent/i }));
    expect(onHeart).toHaveBeenCalledTimes(1);
  });

  it('calls onBookmark when the bookmark button is clicked', () => {
    const onBookmark = jest.fn();
    render(<SavedProblemCard {...defaultProps} onBookmark={onBookmark} />);
    fireEvent.click(screen.getByRole('button', { name: /save problem/i }));
    expect(onBookmark).toHaveBeenCalledTimes(1);
  });

  it('does not propagate click events from action buttons', () => {
    const onHeart = jest.fn();
    render(<SavedProblemCard {...defaultProps} onHeart={onHeart} />);
    // Clicking the button should fire onHeart, not bubble to a parent handler
    const btn = screen.getByRole('button', { name: /log ascent/i });
    fireEvent.click(btn);
    expect(onHeart).toHaveBeenCalledTimes(1);
  });

  // --- Active styles ---

  it('applies active style to bookmark button when saved=true', () => {
    render(<SavedProblemCard {...defaultProps} saved={true} />);
    expect(screen.getByRole('button', { name: /save problem/i })).toHaveClass('bg-blue-500');
  });

  it('applies inactive style to bookmark button when saved=false', () => {
    render(<SavedProblemCard {...defaultProps} saved={false} />);
    expect(screen.getByRole('button', { name: /save problem/i })).toHaveClass('bg-black/40');
  });

  it('applies active style to ascent button when liked=true', () => {
    render(<SavedProblemCard {...defaultProps} liked={true} />);
    expect(screen.getByRole('button', { name: /log ascent/i })).toHaveClass('bg-emerald-500');
  });

  it('applies inactive style to ascent button when liked=false', () => {
    render(<SavedProblemCard {...defaultProps} liked={false} />);
    expect(screen.getByRole('button', { name: /log ascent/i })).toHaveClass('bg-black/40');
  });
});
