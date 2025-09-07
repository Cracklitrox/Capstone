import { render, screen } from '@testing-library/react';
import App from './App';

test('renders proyecto sistema de reservas header', () => {
  render(<App />);
  const headerElement = screen.getByText(/proyecto sistema de reservas/i);
  expect(headerElement).toBeInTheDocument();
});
