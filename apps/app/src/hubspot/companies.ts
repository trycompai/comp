import { makeHubSpotRequest } from './api-client';
import type { CompanySearchResult } from './types';

/**
 * Searches for a company in HubSpot by name
 * @param companyName - The exact company name to search for
 * @returns Promise resolving to CompanySearchResult with the company ID if found
 *
 * @example
 * ```typescript
 * const result = await findCompanyByName("Acme Corp");
 * if (result.exists) {
 *   console.log("Found company:", result.companyId);
 * } else {
 *   console.log("Company not found");
 * }
 * ```
 */
export async function findCompanyByName(companyName: string): Promise<CompanySearchResult> {
  console.log('[HubSpot] Searching for company:', companyName);

  try {
    const response = await makeHubSpotRequest('/companies/search', {
      method: 'POST',
      body: JSON.stringify({
        filterGroups: [
          {
            filters: [
              {
                propertyName: 'name',
                operator: 'EQ',
                value: companyName,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[HubSpot] Error searching for company:', errorData);
      return { companyId: null, exists: false, error: String(errorData) };
    }

    const data = await response.json();
    console.log('[HubSpot] Company search results:', data.total || 0, 'companies found');

    if (data.results && data.results.length > 0) {
      return { companyId: data.results[0].id, exists: true };
    }

    return { companyId: null, exists: false };
  } catch (error) {
    console.error('[HubSpot] Error in findCompanyByName:', error);
    return { companyId: null, exists: false, error: String(error) };
  }
}

/**
 * Searches for a company in HubSpot by domain
 * @param domain - The domain to search for (e.g., 'example.com')
 * @returns Promise resolving to CompanySearchResult with the company ID if found
 *
 * @example
 * ```typescript
 * const result = await findCompanyByDomain("example.com");
 * if (result.exists) {
 *   console.log("Found company:", result.companyId);
 * } else {
 *   console.log("Company not found");
 * }
 * ```
 */
export async function findCompanyByDomain(domain: string): Promise<CompanySearchResult> {
  console.log('[HubSpot] Searching for company by domain:', domain);

  try {
    const response = await makeHubSpotRequest('/companies/search', {
      method: 'POST',
      body: JSON.stringify({
        filterGroups: [
          {
            filters: [
              {
                propertyName: 'domain',
                operator: 'EQ',
                value: domain,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[HubSpot] Error searching for company by domain:', errorData);
      return { companyId: null, exists: false, error: String(errorData) };
    }

    const data = await response.json();
    console.log('[HubSpot] Company domain search results:', data.total || 0, 'companies found');

    if (data.results && data.results.length > 0) {
      console.log('[HubSpot] Found company with domain:', domain, 'ID:', data.results[0].id);
      return { companyId: data.results[0].id, exists: true };
    }

    return { companyId: null, exists: false };
  } catch (error) {
    console.error('[HubSpot] Error in findCompanyByDomain:', error);
    return { companyId: null, exists: false, error: String(error) };
  }
}

/**
 * Creates a new company in HubSpot
 * @param params - Company creation parameters
 * @param params.companyName - The name of the company
 * @param params.companySize - The number of employees
 * @param params.complianceNeeds - Array of compliance frameworks needed
 * @param params.domain - The company domain (optional)
 * @returns Promise resolving to the new company ID if successful, null otherwise
 *
 * @example
 * ```typescript
 * const companyId = await createCompany({
 *   companyName: "New Corp",
 *   companySize: 50,
 *   complianceNeeds: ["SOC 2", "ISO 27001"],
 *   domain: "newcorp.com"
 * });
 * if (companyId) {
 *   console.log("Created company:", companyId);
 * }
 * ```
 */
export async function createCompany({
  companyName,
  companySize,
  complianceNeeds,
  domain,
  orgId,
}: {
  companyName: string;
  companySize?: number;
  complianceNeeds: string[];
  domain?: string;
  orgId?: string;
}): Promise<string | null> {
  console.log('[HubSpot] Creating new company...');

  try {
    const properties: {
      name: string;
      numberofemployees?: number;
      compliance_frameworks: string;
      domain?: string;
      org_id?: string;
    } = {
      name: companyName,
      compliance_frameworks: complianceNeeds.join(','),
    };

    // Only include employee count if it's a valid number greater than 0
    if (companySize && companySize > 0) {
      properties.numberofemployees = companySize;
    }

    // Include domain if provided
    if (domain) {
      properties.domain = domain;
    }

    if (orgId) {
      properties.org_id = orgId;
    }

    const response = await makeHubSpotRequest('/companies', {
      method: 'POST',
      body: JSON.stringify({
        properties,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[HubSpot] Error creating company:', errorData);
      return null;
    }

    const data = await response.json();
    console.log('[HubSpot] Company created successfully with ID:', data.id);
    return data.id;
  } catch (error) {
    console.error('[HubSpot] Error in createCompany:', error);
    return null;
  }
}

/**
 * Updates an existing company in HubSpot (only updates empty fields)
 * @param params - Company update parameters
 * @param params.companyId - The HubSpot company ID to update
 * @param params.companyName - The new company name
 * @param params.companySize - The new number of employees
 * @param params.complianceNeeds - Array of compliance frameworks needed
 * @returns Promise resolving to true if successful, false otherwise
 *
 * @example
 * ```typescript
 * const success = await updateCompany({
 *   companyId: "12345",
 *   companyName: "Updated Corp",
 *   companySize: 100,
 *   complianceNeeds: ["SOC 2", "HIPAA"]
 * });
 * if (success) {
 *   console.log("Company updated successfully");
 * }
 * ```
 */
export async function updateCompany({
  companyId,
  companyName,
  companySize,
  complianceNeeds,
  orgId,
}: {
  companyId: string;
  companyName: string;
  companySize?: number;
  complianceNeeds: string[];
  orgId?: string;
}): Promise<boolean> {
  console.log('[HubSpot] Updating existing company with ID:', companyId);

  try {
    // First, fetch the existing company data
    const getResponse = await makeHubSpotRequest(`/companies/${companyId}`, {
      method: 'GET',
    });

    if (!getResponse.ok) {
      console.error('[HubSpot] Error fetching existing company data');
      return false;
    }

    const existingCompany = await getResponse.json();
    const existingProperties = existingCompany.properties || {};

    // Build update object with only empty/missing fields
    const propertiesToUpdate: {
      name?: string;
      numberofemployees?: number;
      compliance_frameworks?: string;
      org_id?: string;
    } = {};

    // Only update name if it's empty or missing
    if (!existingProperties.name || existingProperties.name.trim() === '') {
      propertiesToUpdate.name = companyName;
    }

    // Only update employee count if it's empty AND we have a valid value to set
    if (
      companySize &&
      companySize > 0 &&
      (!existingProperties.numberofemployees || existingProperties.numberofemployees === '0')
    ) {
      propertiesToUpdate.numberofemployees = companySize;
    }

    // Only update compliance frameworks if it's empty or if the length doesn't match
    const existingFrameworks = existingProperties.compliance_frameworks
      ? existingProperties.compliance_frameworks
          .split(',')
          .map((s: string) => s.trim())
          .filter(Boolean)
      : [];

    if (
      !existingProperties.compliance_frameworks ||
      existingProperties.compliance_frameworks.trim() === '' ||
      existingFrameworks.length !== complianceNeeds.length
    ) {
      propertiesToUpdate.compliance_frameworks = complianceNeeds.join(',');
    }

    // Only update org_id if it's empty
    if (orgId && (!existingProperties.org_id || existingProperties.org_id.trim() === '')) {
      propertiesToUpdate.org_id = orgId;
    }

    // If there's nothing to update, return success
    if (Object.keys(propertiesToUpdate).length === 0) {
      console.log('[HubSpot] Company already has all fields populated, skipping update');
      return true;
    }

    console.log('[HubSpot] Updating company with:', propertiesToUpdate);

    const response = await makeHubSpotRequest(`/companies/${companyId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        properties: propertiesToUpdate,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[HubSpot] Error updating company:', errorData);
      return false;
    }

    console.log('[HubSpot] Company updated successfully');
    return true;
  } catch (error) {
    console.error('[HubSpot] Error in updateCompany:', error);
    return false;
  }
}

/**
 * Creates a new company or updates an existing one
 * @param params - Company creation/update parameters
 * @param params.companyName - The company name
 * @param params.companySize - The number of employees
 * @param params.complianceNeeds - Array of compliance frameworks needed
 * @param params.existingCompanyId - Optional existing company ID to update
 * @param params.domain - The company domain (optional, used for new companies)
 * @returns Promise resolving to the company ID if successful, null otherwise
 *
 * @example
 * ```typescript
 * // Create new company
 * const companyId = await createOrUpdateCompany({
 *   companyName: "Acme Corp",
 *   companySize: 50,
 *   complianceNeeds: ["SOC 2"],
 *   domain: "acmecorp.com"
 * });
 *
 * // Update existing company
 * const updatedId = await createOrUpdateCompany({
 *   companyName: "Acme Corp",
 *   companySize: 75,
 *   complianceNeeds: ["SOC 2", "ISO 27001"],
 *   existingCompanyId: "12345"
 * });
 * ```
 */
export async function createOrUpdateCompany({
  companyName,
  companySize,
  complianceNeeds,
  existingCompanyId,
  domain,
  orgId,
}: {
  companyName: string;
  companySize?: number;
  complianceNeeds: string[];
  existingCompanyId?: string;
  domain?: string;
  orgId?: string;
}): Promise<string | null> {
  if (existingCompanyId) {
    const success = await updateCompany({
      companyId: existingCompanyId,
      companyName,
      companySize,
      complianceNeeds,
      orgId,
    });
    return success ? existingCompanyId : null;
  } else {
    return await createCompany({
      companyName,
      companySize,
      complianceNeeds,
      domain,
      orgId,
    });
  }
}
