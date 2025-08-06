import { getGT } from 'gt-next/server';
import { makeHubSpotRequest } from './api-client';
import type { CreateHubSpotDealResult } from './types';

/**
 * Checks if a deal already exists for a contact with a specific name pattern
 * @param contactId - The HubSpot contact ID
 * @param dealNamePattern - Pattern to match in deal names
 * @returns The existing deal ID if found, null otherwise
 */
async function findExistingDealForContact(
  contactId: string,
  dealNamePattern: string,
): Promise<string | null> {
  try {
    console.log('[HubSpot] Checking for existing deals for contact:', contactId);

    // Search for deals associated with this contact
    const response = await makeHubSpotRequest('/deals/search', {
      method: 'POST',
      body: JSON.stringify({
        filterGroups: [
          {
            filters: [
              {
                propertyName: 'associations.contact',
                operator: 'EQ',
                value: contactId,
              },
            ],
          },
        ],
        properties: ['dealname', 'dealstage', 'createdate'],
        limit: 10,
      }),
    });

    if (!response.ok) {
      console.error('[HubSpot] Error searching for existing deals');
      return null;
    }

    const data = await response.json();

    if (data.results && data.results.length > 0) {
      // Check if any recent deal matches our pattern
      const recentDeals = data.results.filter(
        (deal: { properties: { dealname: string; createdate: string }; id: string }) => {
          const dealName = deal.properties.dealname;
          const createDate = new Date(deal.properties.createdate);
          const hoursSinceCreation = (Date.now() - createDate.getTime()) / (1000 * 60 * 60);

          // Check if deal was created in the last 24 hours and matches the pattern
          return dealName?.includes(dealNamePattern) && hoursSinceCreation < 24;
        },
      );

      if (recentDeals.length > 0) {
        console.log('[HubSpot] Found existing recent deal:', recentDeals[0].id);
        return recentDeals[0].id;
      }
    }

    return null;
  } catch (error) {
    console.error('[HubSpot] Error checking for existing deals:', error);
    return null;
  }
}

/**
 * Creates a new deal in HubSpot and associates it with a contact and optionally a company
 * @param params - Deal creation parameters
 * @param params.contactId - The HubSpot contact ID to associate with the deal
 * @param params.companyId - Optional HubSpot company ID to associate with the deal
 * @param params.dealName - The name/title of the deal
 * @param params.dealStage - The pipeline stage (defaults to "appointmentscheduled")
 * @param params.amount - Optional deal amount
 * @param params.complianceNeeds - Optional array of compliance frameworks needed
 * @returns Promise resolving to CreateHubSpotDealResult
 *
 * @example
 * ```typescript
 * const result = await createDeal({
 *   contactId: "12345",
 *   companyId: "67890",
 *   dealName: "Demo Request - Acme Corp",
 *   dealStage: "appointmentscheduled",
 *   complianceNeeds: ["SOC 2", "ISO 27001"]
 * });
 *
 * if (result.success) {
 *   console.log("Deal created:", result.dealId);
 * }
 * ```
 */
export async function createDeal({
  contactId,
  companyId,
  dealName,
  dealStage,
  amount,
  complianceNeeds,
}: {
  contactId: string;
  companyId?: string;
  dealName: string;
  dealStage?: string;
  amount?: number;
  complianceNeeds?: string[];
}): Promise<CreateHubSpotDealResult> {
  console.log('[HubSpot] Creating deal:', {
    contactId,
    companyId,
    dealName,
    dealStage,
    complianceNeeds,
  });
  const t = await getGT();

  try {
    // Check if a deal already exists for this contact
    const existingDealId = await findExistingDealForContact(contactId, dealName);

    if (existingDealId) {
      console.log('[HubSpot] Deal already exists for this contact, skipping creation');
      return {
        success: true,
        message: t('Deal already exists'),
        dealId: existingDealId,
      };
    }

    const response = await makeHubSpotRequest('/deals', {
      method: 'POST',
      body: JSON.stringify({
        properties: {
          dealname: dealName,
          // Use provided stage or default to first stage in pipeline
          dealstage: dealStage || 'appointmentscheduled',
          // Optional amount if provided
          ...(amount && { amount: amount.toString() }),
          // Add compliance needs as a custom property or notes
          ...(complianceNeeds &&
            complianceNeeds.length > 0 && {
              description: `Compliance needs: ${complianceNeeds.join(', ')}`,
            }),
          // Set close date to 30 days from now (standard sales cycle)
          closedate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          hubspot_owner_id: '79699630',
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[HubSpot] Error creating deal:', errorData);
      throw new Error(`Failed to create deal: ${response.statusText}`);
    }

    const data = await response.json();
    const dealId = data.id;
    console.log('[HubSpot] Deal created successfully with ID:', dealId);

    // Associate with contact and company
    await associateDealWithContact({
      dealId,
      contactId,
    });

    if (companyId) {
      await associateDealWithCompany({
        dealId,
        companyId,
      });
    }

    return {
      success: true,
      message: t('Deal created successfully'),
      dealId,
    };
  } catch (error) {
    console.error('[HubSpot] Error in createDeal:', error);
    return {
      success: false,
      message: String(error),
    };
  }
}

/**
 * Associates a deal with a contact in HubSpot
 * @param params - Association parameters
 * @param params.dealId - The HubSpot deal ID
 * @param params.contactId - The HubSpot contact ID to associate
 * @returns Promise resolving to true if successful, false otherwise
 *
 * @private
 * @example
 * ```typescript
 * const success = await associateDealWithContact({
 *   dealId: "deal123",
 *   contactId: "contact456"
 * });
 * ```
 */
async function associateDealWithContact({
  dealId,
  contactId,
}: {
  dealId: string;
  contactId: string;
}): Promise<boolean> {
  console.log('[HubSpot] Associating deal with contact...');

  try {
    const response = await makeHubSpotRequest(
      `/deals/${dealId}/associations/contacts/${contactId}/deal_to_contact`,
      {
        method: 'PUT',
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[HubSpot] Error associating deal with contact:', errorData);
      return false;
    }

    console.log('[HubSpot] Deal associated with contact successfully');
    return true;
  } catch (error) {
    console.error('[HubSpot] Error in associateDealWithContact:', error);
    return false;
  }
}

/**
 * Associates a deal with a company in HubSpot
 * @param params - Association parameters
 * @param params.dealId - The HubSpot deal ID
 * @param params.companyId - The HubSpot company ID to associate
 * @returns Promise resolving to true if successful, false otherwise
 *
 * @private
 * @example
 * ```typescript
 * const success = await associateDealWithCompany({
 *   dealId: "deal123",
 *   companyId: "company789"
 * });
 * ```
 */
async function associateDealWithCompany({
  dealId,
  companyId,
}: {
  dealId: string;
  companyId: string;
}): Promise<boolean> {
  console.log('[HubSpot] Associating deal with company...');

  try {
    const response = await makeHubSpotRequest(
      `/deals/${dealId}/associations/companies/${companyId}/deal_to_company`,
      {
        method: 'PUT',
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[HubSpot] Error associating deal with company:', errorData);
      return false;
    }

    console.log('[HubSpot] Deal associated with company successfully');
    return true;
  } catch (error) {
    console.error('[HubSpot] Error in associateDealWithCompany:', error);
    return false;
  }
}
