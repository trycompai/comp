import type { CredentialField } from '../../types';

/**
 * GCP Service Account Credential Fields
 *
 * Users can either paste the full JSON key or enter individual fields.
 */
export const gcpCredentialFields: CredentialField[] = [
  {
    id: 'serviceAccountKey',
    label: 'Service Account JSON Key',
    type: 'textarea',
    required: true,
    placeholder: '{\n  "type": "service_account",\n  "project_id": "...",\n  ...\n}',
    helpText: 'Paste the entire JSON key file contents from your GCP service account',
  },
];

/**
 * Setup instructions for GCP integration
 */
export const gcpSetupInstructions = `## Setting up GCP Service Account

### Step 1: Create a Service Account
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to **IAM & Admin** → **Service Accounts**
3. Click **Create Service Account**
4. Enter a name like \`comp-security-audit\`
5. Click **Create and Continue**

### Step 2: Grant Project-Level Roles
In your **project's IAM settings**, assign these roles to the service account:

- \`Security Reviewer\` (roles/iam.securityReviewer)
- \`Viewer\` (roles/viewer)
- \`Monitoring Viewer\` (roles/monitoring.viewer)
- \`Logs Viewer\` (roles/logging.viewer)

### Step 3: Grant Organization-Level Roles (Required for Security Command Center)

⚠️ **Important:** Security Command Center is an organization-level service. You must grant permissions at your **GCP Organization**, not just the project.

1. Go to **IAM & Admin** → **IAM**
2. Use the project dropdown at the top to switch to your **Organization** (not a project)
3. Click **Grant Access**
4. Enter the service account email (e.g., \`comp-security-audit@your-project.iam.gserviceaccount.com\`)
5. Add the role: **Security Center Findings Viewer** (\`roles/securitycenter.findingsViewer\`)
6. Click **Save**

> **Note:** If you don't have organization-level access, contact your GCP administrator to grant this role.

### Step 4: Create and Download Key
1. Click on the created service account
2. Go to the **Keys** tab
3. Click **Add Key** → **Create new key**
4. Select **JSON** format
5. Click **Create** (the key file will download)

### Step 5: Enable Required APIs
In your GCP project, enable these APIs:
- Security Command Center API
- Cloud Resource Manager API
- IAM API
- Cloud Monitoring API
- Cloud Logging API

Go to **APIs & Services** → **Library** and search for each API to enable it.

### Step 6: Paste the JSON Key
Copy the entire contents of the downloaded JSON key file and paste it in the field below.

> **Security Note:** The service account key grants access to your GCP resources. 
> Keep it secure and never share it publicly.`;
