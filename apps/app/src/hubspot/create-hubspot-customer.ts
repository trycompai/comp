'use server';

import { isHubSpotConfigured } from './api-client';
import { createContact, findContactByEmail } from './contacts';
import type { CreateHubSpotContactResult } from './types';

/**
 * Server action to create or retrieve a HubSpot contact by email
 *
 * This action is called when a user completes Step 1 of the demo form.
 * It will either create a new contact or return an existing contact's ID.
 *
 * @param email - The email address of the contact
 * @returns Promise resolving to CreateHubSpotContactResult
 *
 * @example
 * ```typescript
 * const result = await createHubSpotContact("user@example.com");
 * if (result.success) {
 *   console.log("Contact ID:", result.contactId);
 * } else {
 *   console.error("Failed:", result.message);
 * }
 * ```
 */
export async function createHubSpotContact(email: string): Promise<CreateHubSpotContactResult> {
  console.log('[HubSpot] Processing contact for email:', email);

  try {
    if (!email || !email.includes('@')) {
      console.error('[HubSpot] Invalid email provided');
      return {
        success: false,
        message: 'Valid email is required',
      };
    }

    if (!isHubSpotConfigured()) {
      console.error('[HubSpot] API key not configured');
      return {
        success: true,
        message: 'Contact processed',
      };
    }

    // First, check if contact already exists
    const existingContact = await findContactByEmail(email);

    if (existingContact.contactId) {
      console.log('[HubSpot] Contact already exists with ID:', existingContact.contactId);
      return {
        success: true,
        message: 'Contact already exists',
        contactId: existingContact.contactId,
      };
    }

    // Create new contact
    const newContact = await createContact(email);

    if (!newContact.contactId) {
      console.error('[HubSpot] Failed to create contact');
      return {
        success: false,
        message: newContact.error || 'Failed to create contact',
      };
    }

    return {
      success: true,
      message: 'Contact created successfully',
      contactId: newContact.contactId,
    };
  } catch (error) {
    console.error('[HubSpot] Error in createHubSpotContact:', error);

    // Don't expose internal errors to the client
    return {
      success: true,
      message: 'Contact processed',
    };
  }
}
