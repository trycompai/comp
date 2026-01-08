import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@trycompai/design-system';

describe('Card', () => {
  it('renders card with content', () => {
    render(
      <Card>
        <CardContent>Card content</CardContent>
      </Card>
    );
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('renders card with all slots', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription>Description</CardDescription>
        </CardHeader>
        <CardContent>Content</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>
    );

    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
    expect(screen.getByText('Footer')).toBeInTheDocument();
  });

  it('renders simple content without explicit CardContent wrapper', () => {
    render(<Card>Simple content</Card>);
    expect(screen.getByText('Simple content')).toBeInTheDocument();
  });

  it('applies maxWidth prop', () => {
    const { container } = render(<Card maxWidth="sm">Content</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('max-w-sm');
  });
});

describe('CardTitle', () => {
  it('renders as heading', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>My Title</CardTitle>
        </CardHeader>
      </Card>
    );
    expect(screen.getByRole('heading', { name: 'My Title' })).toBeInTheDocument();
  });
});

describe('CardDescription', () => {
  it('renders description text', () => {
    render(
      <Card>
        <CardHeader>
          <CardDescription>My description</CardDescription>
        </CardHeader>
      </Card>
    );
    expect(screen.getByText('My description')).toBeInTheDocument();
  });
});
