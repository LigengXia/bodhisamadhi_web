import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { Textarea } from './Textarea';

afterEach(cleanup);

describe('Textarea', () => {
  it('renders a label bound to the textarea control', () => {
    render(<Textarea label="Your reflection" name="body" />);
    const control = screen.getByLabelText('Your reflection');
    expect(control.tagName).toBe('TEXTAREA');
  });

  it('sets aria-invalid and links the error message via aria-describedby', () => {
    render(
      <Textarea
        label="Your reflection"
        error="Please write something first."
      />,
    );
    const control = screen.getByLabelText('Your reflection');
    expect(control).toHaveAttribute('aria-invalid', 'true');

    const describedBy = control.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!.trim())).toHaveTextContent(
      'Please write something first.',
    );
  });

  it('has no aria-invalid when there is no error', () => {
    render(<Textarea label="Your reflection" />);
    expect(screen.getByLabelText('Your reflection')).not.toHaveAttribute(
      'aria-invalid',
    );
  });

  it('links help text via aria-describedby', () => {
    render(<Textarea label="Your reflection" help="Keep it kind." />);
    const describedBy = screen
      .getByLabelText('Your reflection')
      .getAttribute('aria-describedby');
    expect(document.getElementById(describedBy!.trim())).toHaveTextContent(
      'Keep it kind.',
    );
  });
});
