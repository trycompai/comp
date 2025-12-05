/**
 * API Types for Your Integration
 *
 * Define types that match the external API responses.
 * These provide type safety when making API calls in checks.
 */

// Example: Define types for your API responses
export interface ExampleResource {
  id: string;
  name: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface ExampleUser {
  id: string;
  email: string;
  role: string;
}
