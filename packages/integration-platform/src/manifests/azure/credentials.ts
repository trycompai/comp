import { z } from 'zod';

/**
 * Azure credential fields for the connection form
 */
export const azureCredentialFields = [
  {
    id: 'tenantId',
    label: 'Tenant ID (Directory ID)',
    type: 'text' as const,
    required: true,
    placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    helpText: 'Your tenant ID. Found in Azure Portal → Microsoft Entra ID → Overview',
  },
  {
    id: 'clientId',
    label: 'Client ID (Application ID)',
    type: 'text' as const,
    required: true,
    placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    helpText: 'The Application (client) ID of your App Registration',
  },
  {
    id: 'clientSecret',
    label: 'Client Secret',
    type: 'password' as const,
    required: true,
    placeholder: 'Your client secret value',
    helpText: 'A client secret created for the App Registration',
  },
  {
    id: 'subscriptionId',
    label: 'Subscription ID',
    type: 'text' as const,
    required: true,
    placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    helpText: 'The Azure subscription to monitor',
  },
];

/**
 * Validation schema for Azure credentials
 */
export const azureCredentialSchema = z.object({
  tenantId: z
    .string()
    .uuid('Must be a valid UUID')
    .or(z.string().regex(/^[a-f0-9-]{36}$/i, 'Must be a valid Azure tenant ID')),
  clientId: z
    .string()
    .uuid('Must be a valid UUID')
    .or(z.string().regex(/^[a-f0-9-]{36}$/i, 'Must be a valid Application ID')),
  clientSecret: z.string().min(1, 'Client secret is required'),
  subscriptionId: z
    .string()
    .uuid('Must be a valid UUID')
    .or(z.string().regex(/^[a-f0-9-]{36}$/i, 'Must be a valid Subscription ID')),
});

/**
 * Setup instructions for Azure Service Principal
 */
export const azureSetupInstructions = `## Setting up Azure Service Principal

### Step 1: Create an App Registration
1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Microsoft Entra ID** → **App registrations**
3. Click **+ New registration**
4. Enter a name like \`comp-security-audit\`
5. Leave the default settings and click **Register**

### Step 2: Create a Client Secret
1. In your new App Registration, go to **Certificates & secrets**
2. Click **New client secret**
3. Add a description and select expiry (recommended: 12-24 months)
4. Click **Add** and **copy the secret value immediately** (you won't see it again)

### Step 3: Grant Required Permissions

You need to assign 3 roles to your App Registration. Repeat these steps for each role:

1. Go to **Subscriptions** → Select your subscription (e.g., "Subscription 1")
2. Click **Access control (IAM)** in the left sidebar
3. Click the **+ Add** button → **Add role assignment**
4. In the **Role** tab, search for and select one of these roles:
   - **Reader** - For general resource access
   - **Security Reader** - For Microsoft Defender for Cloud  
   - **Monitoring Reader** - For alerts and metrics
5. Click **Next**
6. In the **Members** tab:
   - Select **"User, group, or service principal"**
   - Click **+ Select members**
   - Search for your App Registration name (e.g., "comp-security-audit")
   - Select it and click **Select**
7. Click **Review + assign**

> **Important:** Repeat steps 3-7 for all three roles (Reader, Security Reader, Monitoring Reader)

### Step 4: Get Your IDs
From the Azure Portal, collect:
- **Tenant ID**: Microsoft Entra ID → Overview → Tenant ID
- **Client ID**: Microsoft Entra ID → App registrations → Your app → Application (client) ID
- **Subscription ID**: Subscriptions → Your subscription → Subscription ID

### Step 5: Enter Credentials
Paste the Tenant ID, Client ID, Client Secret, and Subscription ID in the fields below.

> **Security Note:** The service principal should have read-only access. Never grant write permissions for compliance monitoring.`;
