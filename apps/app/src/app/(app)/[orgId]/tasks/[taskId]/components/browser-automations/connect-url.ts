// The URL field renders a static "https://" prefix, so the field itself holds
// only the part after the scheme. If a user pastes a full URL, drop the scheme
// so it isn't doubled ("https://https://...").
export function stripScheme(input: string): string {
  return input.replace(/^\s*https?:\/\//i, '').trimStart();
}

// Accept whatever the user gives us — a bare domain (notion.so), a homepage, or
// a deep link — and turn it into a full URL. The analyzer navigates to the
// sign-in form from there, so the user never has to find the exact /login page.
export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}
