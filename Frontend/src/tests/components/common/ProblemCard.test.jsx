// ============================================================
// Final Phase Tests — ProblemCard
// ============================================================

import { render, screen } from '@testing-library/react';
import ProblemCard from '../../../components/common/ProblemCard';

describe('ProblemCard — Final Phase', () => {
  it('renders the problem id', () => {
    render(<ProblemCard id="42" grade="v5" />);
    expect(screen.getByText('Problem #42')).toBeInTheDocument();
  });

  it('renders the grade', () => {
    render(<ProblemCard id="1" grade="v3" />);
    expect(screen.getByText('Grade: v3')).toBeInTheDocument();
  });

  it('renders the setter when provided', () => {
    render(<ProblemCard id="1" grade="v2" setter="Alex" />);
    expect(screen.getByText('Set by: Alex')).toBeInTheDocument();
  });

  it('does not render setter section when setter is not provided', () => {
    render(<ProblemCard id="1" grade="v2" />);
    expect(screen.queryByText(/Set by:/)).not.toBeInTheDocument();
  });

  it('renders the status badge when provided', () => {
    render(<ProblemCard id="1" grade="v2" status="Sent" />);
    expect(screen.getByText('Sent')).toBeInTheDocument();
  });

  it('does not render the status badge when not provided', () => {
    render(<ProblemCard id="1" grade="v2" />);
    expect(screen.queryByText('Sent')).not.toBeInTheDocument();
  });

  it('renders all three props together correctly', () => {
    render(<ProblemCard id="7" grade="v8" setter="Jordan" status="Project" />);
    expect(screen.getByText('Problem #7')).toBeInTheDocument();
    expect(screen.getByText('Grade: v8')).toBeInTheDocument();
    expect(screen.getByText('Set by: Jordan')).toBeInTheDocument();
    expect(screen.getByText('Project')).toBeInTheDocument();
  });
});
