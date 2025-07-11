# HubSpot Integration

These server actions handle HubSpot integration for the demo form.

## Setup

1. **Create a HubSpot Private App**:
   - Go to HubSpot Settings > Integrations > Private Apps
   - Create a new private app
   - Grant the following scopes:
     - `crm.objects.contacts.read`
     - `crm.objects.contacts.write`
     - `crm.objects.companies.read`
     - `crm.objects.companies.write`
     - `crm.objects.associations.read`
   - Copy the access token

2. **Set Environment Variable**:
   Add the following to your `.env.local` file:
   ```
   HUBSPOT_ACCESS_TOKEN=your_private_app_access_token_here
   ```

## Server Actions

### `createHubSpotContact(email: string, source?: string)`

Creates or updates a HubSpot contact when step 1 is completed.

**Location**: `/app/(marketing)/demo/actions/create-hubspot-customer.ts`

**Parameters:**

- `email` (required): Contact email address
- `source` (optional): Lead source (defaults to "demo_form_step_1")

**Returns:**

```typescript
{
  success: boolean;
  message: string;
  contactId?: string; // HubSpot contact ID if successful
}
```

**Important Notes:**

- If a contact already exists, it returns the existing contact ID without updating
- Only creates new contacts with email property

### `updateHubSpotContactAndCreateCompany(...)`

Updates the HubSpot contact with additional information and creates/updates a company when step 2 is completed.

**Location**: `/app/(marketing)/demo/actions/update-hubspot-contact.ts`

**Parameters:**

- `email` (required): Contact email address (used to find the contact)
- `name` (required): Full name of the contact
- `phone` (required): Phone number
- `company` (required): Company name
- `companySize` (required): Company size

**Returns:**

```typescript
{
  success: boolean;
  message: string;
  contactId?: string; // HubSpot contact ID
  companyId?: string; // HubSpot company ID
}
```

**Actions performed:**

1. Finds the contact by email
2. Updates contact with:
   - `firstname`: First part of the name
   - `lastname`: Rest of the name
   - `phone`: Phone number
3. Creates or updates company with:
   - `name`: Company name
   - `numberofemployees`: Company size (HubSpot standard property)
4. Associates the contact with the company

### `createHubSpotDeal`

Creates a new deal in HubSpot and associates it with a contact and company.

**Location**: `/app/(marketing)/demo/actions/create-hubspot-deal.ts`

**Parameters:**

- `contactId` (required): HubSpot contact ID
- `companyId` (required): HubSpot company ID

**Returns:**

```typescript
{
  success: boolean;
  message: string;
}
```

**Actions performed:**

1. Creates a new deal with:
   - Deal name: "Demo Request - [Company Name]"
   - Deal stage: "appointmentscheduled" (or custom stage)
   - Compliance needs in description
   - 30-day close date
2. Associates the deal with both contact and company
3. Triggers the sales pipeline automatically

## Usage Example

```typescript
// Step 1: Create contact
const contactResult = await createHubSpotContact('user@example.com');

// Step 2: Update contact and create company
const updateResult = await updateHubSpotContactAndCreateCompany(
  'user@example.com',
  'John Doe',
  '+1 555-1234',
  'Acme Inc.',
  '51-200',
);

console.log('Contact ID:', updateResult.contactId);
console.log('Company ID:', updateResult.companyId);
```

## Standard HubSpot Properties Used

**Contact Properties:**

- `email`: Contact email (standard)
- `firstname`: First name (standard)
- `lastname`: Last name (standard)
- `phone`: Phone number (standard)

**Company Properties:**

- `name`: Company name (standard)
- `numberofemployees`: Company size (standard) - accepts values like "1-5", "6-10", "11-25", "26-50", "51-200", "201-500", "501-1000", "1001-5000", "5001-10000", "10000+"

## Error Handling

- If the API key is not configured, actions return success to avoid blocking the form
- All errors are logged server-side with `[HubSpot]` prefix for easy filtering
- The form continues to work even if HubSpot integration fails
- If contact exists, no error is thrown - the existing ID is returned
- If company creation fails, contact update still succeeds

## Logging

All server actions include detailed logging with `[HubSpot]` prefix:

- API calls and responses
- Contact/company search results
- Success/failure of each operation
- Error details for debugging

Check server logs to monitor the integration:

```bash
# Filter HubSpot logs
grep "\[HubSpot\]" your-logs.log
```

## Testing

To test without a HubSpot account:

1. Don't set the `HUBSPOT_ACCESS_TOKEN` environment variable
2. The actions will log to console but return success
3. Check server logs to verify the actions are being called

## Benefits of Server Actions

- **Security**: API key never exposed to client
- **Performance**: No additional API routes needed
- **Type Safety**: Full TypeScript support
- **Error Handling**: Errors handled server-side
- **Simpler Code**: Direct function calls instead of fetch
