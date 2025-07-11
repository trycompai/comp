import { makeHubSpotRequest } from './api-client';
import type { ContactSearchResult } from './types';

/**
 * Searches for a contact in HubSpot by email address
 * @param email - The email address to search for
 * @returns Promise resolving to ContactSearchResult with the contact ID if found
 *
 * @example
 * ```typescript
 * const result = await findContactByEmail("john@example.com");
 * if (result.contactId) {
 *   console.log("Found contact:", result.contactId);
 * } else {
 *   console.log("Contact not found:", result.error);
 * }
 * ```
 */
export async function findContactByEmail(email: string): Promise<ContactSearchResult> {
  console.log('[HubSpot] Searching for contact by email...');

  try {
    const response = await makeHubSpotRequest('/contacts/search', {
      method: 'POST',
      body: JSON.stringify({
        filterGroups: [
          {
            filters: [
              {
                propertyName: 'email',
                operator: 'EQ',
                value: email,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[HubSpot] Error searching for contact:', errorData);
      return {
        contactId: null,
        error: `Failed to search contact: ${response.statusText}`,
      };
    }

    const data = await response.json();
    console.log('[HubSpot] Contact search results:', data.total || 0, 'contacts found');

    if (!data.results || data.results.length === 0) {
      return { contactId: null, error: 'Contact not found' };
    }

    return { contactId: data.results[0].id };
  } catch (error) {
    console.error('[HubSpot] Error in findContactByEmail:', error);
    return { contactId: null, error: String(error) };
  }
}

/**
 * Creates a new contact in HubSpot with an email address
 * @param email - The email address for the new contact
 * @returns Promise resolving to ContactSearchResult with the new contact ID
 *
 * @example
 * ```typescript
 * const result = await createContact("newuser@example.com");
 * if (result.contactId) {
 *   console.log("Created contact:", result.contactId);
 * }
 * ```
 */
export async function createContact(email: string): Promise<ContactSearchResult> {
  console.log('[HubSpot] Creating contact with email...');

  try {
    const response = await makeHubSpotRequest('/contacts', {
      method: 'POST',
      body: JSON.stringify({
        properties: {
          email: email,
          lifecyclestage: 'lead',
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[HubSpot] Error creating contact:', errorData);
      return {
        contactId: null,
        error: `Failed to create contact: ${response.statusText}`,
      };
    }

    const data = await response.json();
    console.log('[HubSpot] Contact created successfully with ID:', data.id);
    return { contactId: data.id };
  } catch (error) {
    console.error('[HubSpot] Error in createContact:', error);
    return { contactId: null, error: String(error) };
  }
}

/**
 * Updates a contact's name and phone number in HubSpot (only updates empty fields)
 * @param params - Contact update parameters
 * @param params.contactId - The HubSpot contact ID to update
 * @param params.name - The full name of the contact (will be split into first/last)
 * @param params.phone - The phone number to set
 * @returns Promise resolving to true if successful, false otherwise
 *
 * @example
 * ```typescript
 * const success = await updateContactDetails({
 *   contactId: "12345",
 *   name: "John Doe",
 *   phone: "+1234567890"
 * });
 * if (success) {
 *   console.log("Contact updated successfully");
 * }
 * ```
 */
export async function updateContactDetails({
  contactId,
  name,
  phone,
}: {
  contactId: string;
  name: string;
  phone?: string;
}): Promise<boolean> {
  console.log('[HubSpot] Updating contact with name and phone...');

  try {
    // First, fetch the existing contact data
    const getResponse = await makeHubSpotRequest(`/contacts/${contactId}`, {
      method: 'GET',
    });

    if (!getResponse.ok) {
      console.error('[HubSpot] Error fetching existing contact data');
      return false;
    }

    const existingContact = await getResponse.json();
    const existingProperties = existingContact.properties || {};

    // Build update object with only empty/missing fields
    const propertiesToUpdate: {
      firstname?: string;
      lastname?: string;
      phone?: string;
    } = {};

    // Split the name
    const firstName = name.split(' ')[0];
    const lastName = name.split(' ').slice(1).join(' ') || '';

    // Only update first name if it's empty or missing
    if (!existingProperties.firstname || existingProperties.firstname.trim() === '') {
      propertiesToUpdate.firstname = firstName;
    }

    // Only update last name if it's empty or missing
    if (!existingProperties.lastname || existingProperties.lastname.trim() === '') {
      propertiesToUpdate.lastname = lastName;
    }

    // Only update phone if provided, non-empty, and the existing field is empty
    if (
      phone &&
      phone.trim() &&
      (!existingProperties.phone || existingProperties.phone.trim() === '')
    ) {
      propertiesToUpdate.phone = phone;
    }

    // If there's nothing to update, return success
    if (Object.keys(propertiesToUpdate).length === 0) {
      console.log('[HubSpot] Contact already has all fields populated, skipping update');
      return true;
    }

    console.log('[HubSpot] Updating contact with:', propertiesToUpdate);

    const response = await makeHubSpotRequest(`/contacts/${contactId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        properties: propertiesToUpdate,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[HubSpot] Error updating contact:', errorData);
      return false;
    }

    console.log('[HubSpot] Contact updated successfully');
    return true;
  } catch (error) {
    console.error('[HubSpot] Error in updateContactDetails:', error);
    return false;
  }
}

/**
 * Associates a contact with a company in HubSpot
 * @param params - Association parameters
 * @param params.contactId - The HubSpot contact ID
 * @param params.companyId - The HubSpot company ID to associate
 * @returns Promise resolving to true if successful, false otherwise
 *
 * @example
 * ```typescript
 * const success = await associateContactWithCompany({
 *   contactId: "12345",
 *   companyId: "67890"
 * });
 * if (success) {
 *   console.log("Contact associated with company");
 * }
 * ```
 */
export async function associateContactWithCompany({
  contactId,
  companyId,
}: {
  contactId: string;
  companyId: string;
}): Promise<boolean> {
  console.log('[HubSpot] Associating contact with company...');

  try {
    const response = await makeHubSpotRequest(
      `/contacts/${contactId}/associations/companies/${companyId}/contact_to_company`,
      {
        method: 'PUT',
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[HubSpot] Error associating contact with company:', errorData);
      return false;
    }

    console.log('[HubSpot] Contact and company associated successfully');
    return true;
  } catch (error) {
    console.error('[HubSpot] Error in associateContactWithCompany:', error);
    return false;
  }
}
