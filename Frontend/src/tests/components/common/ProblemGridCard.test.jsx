// ============================================================
// Final Phase Tests — ProblemGridCard
// ============================================================

import { render, screen, fireEvent } from '@testing-library/react';
import ProblemGridCard from '../../../components/common/ProblemGridCard';

jest.mock('../../../components/common/BoardPreview', () => () => (
  <div data-testid="board-preview" />
));

const defaultProps = {
  id: '5',
  grade: 'v6',
  sends: 12,
  name: 'Slab Master',
  holds: [],
  saved: false,
  liked: false,
  authorUsername: 'setter1',
  onBookmark: jest.fn(),
  onHeart: jest.fn(),
  onOpen: jest.fn(),
};

describe('ProblemGridCard — Final Phase', () => {
  beforeEach(() => jest.clearAllMocks());

  // --- Content rendering ---

  it('renders the route name', () => {
    render(<ProblemGridCard {...defaultProps} />);
    expect(screen.getByText('Slab Master')).toBeInTheDocument();
  });

  it('falls back to Problem #id when name is not provided', () => {
    render(<ProblemGridCard {...defaultProps} name={null} />);
    expect(screen.getByText('Problem #5')).toBeInTheDocument();
  });

  it('renders the grade and ascent count', () => {
    render(<ProblemGridCard {...defaultProps} />);
    expect(screen.getByText(/v6 · 12 ascents/)).toBeInTheDocument();
  });

  it('renders 0 ascents correctly', () => {
    render(<ProblemGridCard {...defaultProps} sends={0} />);
    expect(screen.getByText(/v6 · 0 ascents/)).toBeInTheDocument();
  });

  it('renders the author username with @ prefix', () => {
    render(<ProblemGridCard {...defaultProps} />);
    expect(screen.getByText('@setter1')).toBeInTheDocument();
  });

  it('defaults author display to @climber when authorUsername is not provided', () => {
    render(<ProblemGridCard {...defaultProps} authorUsername={null} />);
    expect(screen.getByText('@climber')).toBeInTheDocument();
  });

  it('renders the board preview', () => {
    render(<ProblemGridCard {...defaultProps} />);
    expect(screen.getByTestId('board-preview')).toBeInTheDocument();
  });

  // --- Interactions ---

  it('calls onHeart when the ascent button is clicked', () => {
    const onHeart = jest.fn();
    render(<ProblemGridCard {...defaultProps} onHeart={onHeart} />);
    fireEvent.click(screen.getByRole('button', { name: /log ascent/i }));
    expect(onHeart).toHaveBeenCalledTimes(1);
  });

  it('calls onBookmark when the bookmark button is clicked', () => {
    const onBookmark = jest.fn();
    render(<ProblemGridCard {...defaultProps} onBookmark={onBookmark} />);
    fireEvent.click(screen.getByRole('button', { name: /save problem/i }));
    expect(onBookmark).toHaveBeenCalledTimes(1);
  });

  it('action button clicks do not bubble to the card onOpen handler', () => {
    const onOpen = jest.fn();
    const onHeart = jest.fn();
    render(<ProblemGridCard {...defaultProps} onOpen={onOpen} onHeart={onHeart} />);
    fireEvent.click(screen.getByRole('button', { name: /log ascent/i }));
    expect(onHeart).toHaveBeenCalledTimes(1);
    expect(onOpen).not.toHaveBeenCalled();
  });

  // --- Active styles ---

  it('applies active style to bookmark button when saved=true', () => {
    render(<ProblemGridCard {...defaultProps} saved={true} />);
    expect(screen.getByRole('button', { name: /save problem/i })).toHaveClass('bg-blue-500');
  });

  it('applies inactive style to bookmark button when saved=false', () => {
    render(<ProblemGridCard {...defaultProps} saved={false} />);
    expect(screen.getByRole('button', { name: /save problem/i })).toHaveClass('bg-black/40');
  });

  it('applies active style to ascent button when liked=true', () => {
    render(<ProblemGridCard {...defaultProps} liked={true} />);
    expect(screen.getByRole('button', { name: /log ascent/i })).toHaveClass('bg-emerald-500');
  });

  it('applies inactive style to ascent button when liked=false', () => {
    render(<ProblemGridCard {...defaultProps} liked={false} />);
    expect(screen.getByRole('button', { name: /log ascent/i })).toHaveClass('bg-black/40');
  });
});
