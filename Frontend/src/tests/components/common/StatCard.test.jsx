// ============================================================
// Final Phase Tests — StatCard
// ============================================================

import { render, screen } from '@testing-library/react';
import { Mountain, Bookmark, Target } from 'lucide-react';
import StatCard from '../../../components/common/StatCard';

describe('StatCard — Final Phase', () => {
  it('renders the numeric value', () => {
    render(<StatCard value={42} label="Routes" />);
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders the label', () => {
    render(<StatCard value={10} label="Sends" />);
    expect(screen.getByText('Sends')).toBeInTheDocument();
  });

  it('renders a zero value correctly', () => {
    render(<StatCard value={0} label="Saves" />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('renders with Mountain icon without crashing', () => {
    render(<StatCard icon={Mountain} value={5} label="Ascents" />);
    expect(screen.getByText('Ascents')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders with Bookmark icon without crashing', () => {
    render(<StatCard icon={Bookmark} value={3} label="Saved" />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders without an icon without crashing', () => {
    render(<StatCard value={99} label="No Icon" />);
    expect(screen.getByText('99')).toBeInTheDocument();
    expect(screen.getByText('No Icon')).toBeInTheDocument();
  });

  it('renders string values', () => {
    render(<StatCard value="v5" label="Best Grade" />);
    expect(screen.getByText('v5')).toBeInTheDocument();
  });
});
