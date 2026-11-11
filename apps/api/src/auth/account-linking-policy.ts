/**
 * Providers allowed to link an identity to an existing user by email alone.
 * Empty: better-auth then links only when the provider marked the address
 * verified and the local user is verified. Microsoft is refused separately in
 * `microsoft-sign-up-policy.ts`.
 */
export const TRUSTED_LINKING_PROVIDERS: string[] = [];
