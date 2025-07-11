// API Client
export { HubSpotAPIError, isHubSpotConfigured, makeHubSpotRequest } from './api-client';

// Types
export type {
  CompanySearchResult,
  ContactSearchResult,
  CreateHubSpotContactResult,
  CreateHubSpotDealResult,
  HubSpotCompany,
  HubSpotContact,
  HubSpotDeal,
  UpdateHubSpotContactResult,
} from './types';

// Contacts
export {
  associateContactWithCompany,
  createContact,
  findContactByEmail,
  updateContactDetails,
} from './contacts';

// Companies
export {
  createCompany,
  createOrUpdateCompany,
  findCompanyByName,
  updateCompany,
} from './companies';

// Deals
export { createDeal } from './deals';
