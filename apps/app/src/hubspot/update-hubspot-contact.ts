'use server';

import { isHubSpotConfigured } from './api-client';
import { createOrUpdateCompany, findCompanyByDomain, findCompanyByName } from './companies';
import { associateContactWithCompany, findContactByEmail, updateContactDetails } from './contacts';
import type { UpdateHubSpotContactResult } from './types';

/**
 * Server action to update a HubSpot contact and create/update their company
 *
 * This action is called when a user submits Step 2 of the demo form.
 * It performs the following operations:
 * 1. Finds the existing contact by email
 * 2. Updates the contact with name and phone number
 * 3. Creates a new company or updates an existing one
 * 4. Associates the contact with the company
 *
 * @param params - Contact and company information
 * @param params.email - The contact's email address (used to find existing contact)
 * @param params.name - The contact's full name
 * @param params.phone - The contact's phone number
 * @param params.company - The company name
 * @param params.companySize - The number of employees
 * @param params.complianceNeeds - Array of compliance frameworks needed
 * @returns Promise resolving to UpdateHubSpotContactResult
 *
 * @example
 * ```typescript
 * const result = await updateHubSpotContactAndCreateCompany({
 *   email: "user@example.com",
 *   name: "John Doe",
 *   phone: "+1234567890",
 *   company: "Acme Corp",
 *   companySize: 50,
 *   complianceNeeds: ["SOC 2", "ISO 27001"]
 * });
 *
 * if (result.success) {
 *   console.log("Contact ID:", result.contactId);
 *   console.log("Company ID:", result.companyId);
 * }
 * ```
 */
export async function updateHubSpotContactAndCreateCompany({
  email,
  name,
  phone,
  company,
  companySize,
  complianceNeeds = [],
  orgId,
}: {
  email: string;
  name: string;
  phone: string;
  company: string;
  companySize: number;
  complianceNeeds?: string[];
  orgId?: string;
}): Promise<UpdateHubSpotContactResult> {
  console.log('[HubSpot] Updating contact and creating company for:', {
    email,
    name,
    company,
    companySize,
    complianceNeeds,
    orgId,
  });

  try {
    // Validate inputs
    if (!email || !name || !company) {
      console.error('[HubSpot] Missing required fields');
      return {
        success: false,
        message: 'Email, name, and company are required',
      };
    }

    if (!isHubSpotConfigured()) {
      console.error('[HubSpot] API key not configured');
      return {
        success: true,
        message: 'Contact processed',
      };
    }

    // Extract domain from email
    const emailDomain = email.split('@')[1]?.toLowerCase();
    if (!emailDomain) {
      console.error('[HubSpot] Invalid email format, cannot extract domain');
      return {
        success: false,
        message: 'Invalid email format',
      };
    }

    // Step 1: Find the contact
    const contactResult = await findContactByEmail(email);
    if (!contactResult.contactId) {
      console.error('[HubSpot] Contact not found for email:', email);
      return {
        success: false,
        message: contactResult.error || 'Contact not found',
      };
    }

    const contactId = contactResult.contactId;

    // Step 2: Update contact details
    await updateContactDetails({
      contactId,
      name,
      phone,
    });

    // Step 3: Find company by domain first, then by name
    const companyResult = await findCompanyByDomain(emailDomain);
    let companyId: string | null = null;

    if (companyResult.exists && companyResult.companyId) {
      // Company exists with this domain - update it
      console.log('[HubSpot] Found existing company by domain, updating it');
      companyId = await createOrUpdateCompany({
        companyName: company,
        companySize,
        complianceNeeds,
        existingCompanyId: companyResult.companyId,
        orgId,
      });
    } else {
      // No company with this domain - check by name to avoid duplicates
      console.log('[HubSpot] No company found by domain, checking by name');
      const companyByNameResult = await findCompanyByName(company);
      companyId = await createOrUpdateCompany({
        companyName: company,
        companySize,
        complianceNeeds,
        existingCompanyId: companyByNameResult.companyId || undefined,
        domain: emailDomain, // Pass domain for new companies
        orgId,
      });
    }

    if (!companyId) {
      return {
        success: true,
        message: 'Contact updated, company creation failed',
        contactId,
      };
    }

    // Step 4: Associate contact with company
    await associateContactWithCompany({
      contactId,
      companyId,
    });

    console.log('[HubSpot] Process completed successfully');
    return {
      success: true,
      message: 'Contact updated and company created',
      contactId,
      companyId,
    };
  } catch (error) {
    console.error('[HubSpot] Error in updateHubSpotContactAndCreateCompany:', error);

    // Don't expose internal errors to the client
    return {
      success: true,
      message: 'Contact processed',
    };
  }
}
