/**
 * Result of a contact search operation
 */
export interface ContactSearchResult {
  /** The HubSpot contact ID if found, null otherwise */
  contactId: string | null;
  /** Error message if the search failed */
  error?: string;
}

/**
 * Result of a company search operation
 */
export interface CompanySearchResult {
  /** The HubSpot company ID if found, null otherwise */
  companyId: string | null;
  /** Whether the company exists in HubSpot */
  exists: boolean;
  /** Error message if the search failed */
  error?: string;
}

/**
 * Result of updating a HubSpot contact and creating/updating a company
 */
export interface UpdateHubSpotContactResult {
  /** Whether the operation was successful */
  success: boolean;
  /** Human-readable message about the operation result */
  message: string;
  /** The HubSpot contact ID if successful */
  contactId?: string;
  /** The HubSpot company ID if successful */
  companyId?: string;
}

/**
 * Result of creating a HubSpot contact
 */
export interface CreateHubSpotContactResult {
  /** Whether the operation was successful */
  success: boolean;
  /** Human-readable message about the operation result */
  message: string;
  /** The HubSpot contact ID if successful */
  contactId?: string;
}

/**
 * Result of creating a HubSpot deal
 */
export interface CreateHubSpotDealResult {
  /** Whether the operation was successful */
  success: boolean;
  /** Human-readable message about the operation result */
  message: string;
  /** The HubSpot deal ID if successful */
  dealId?: string;
}

/**
 * HubSpot contact object structure
 */
export interface HubSpotContact {
  /** Unique identifier for the contact */
  id: string;
  /** Contact properties */
  properties: {
    /** Contact's email address */
    email?: string;
    /** Contact's first name */
    firstname?: string;
    /** Contact's last name */
    lastname?: string;
    /** Contact's phone number */
    phone?: string;
    /** Additional properties can be added dynamically */
    [key: string]: unknown;
  };
}

/**
 * HubSpot company object structure
 */
export interface HubSpotCompany {
  /** Unique identifier for the company */
  id: string;
  /** Company properties */
  properties: {
    /** Company name */
    name?: string;
    /** Number of employees */
    numberofemployees?: number;
    /** Additional properties can be added dynamically */
    [key: string]: unknown;
  };
}

/**
 * HubSpot deal object structure
 */
export interface HubSpotDeal {
  /** Unique identifier for the deal */
  id: string;
  /** Deal properties */
  properties: {
    /** Deal name/title */
    dealname?: string;
    /** Current stage in the sales pipeline */
    dealstage?: string;
    /** Deal amount in the account's currency */
    amount?: string;
    /** Expected close date */
    closedate?: string;
    /** Deal description */
    description?: string;
    /** Additional properties can be added dynamically */
    [key: string]: unknown;
  };
}
