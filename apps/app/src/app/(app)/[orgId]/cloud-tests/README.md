# Cloud Tests Feature

A reimagined cloud security testing feature with exceptional UX for connecting cloud providers (AWS, GCP, Azure) and viewing security compliance results.

## Architecture

### Components

#### User-Facing Components

- **EmptyState**: First-time user onboarding with cloud connection cards
- **CloudConnectionCard**: Individual cloud provider connection with inline form validation
- **TestsLayout**: Main orchestration component with UX state management (uses useSWR for real-time updates)
- **ResultsView**: Results display with filters, sorting, and scan controls
- **FindingsTable**: Sortable table with expandable rows for detailed findings
- **CloudSettingsModal**: Manage existing cloud connections (update credentials, disconnect)
- **ChatPlaceholder**: Placeholder for future AI remediation chat interface

#### Server Components

- **page.tsx**: Initial data fetching and server-side rendering

### Server Actions

- **connect-cloud.ts**: Connect new cloud provider with encrypted credentials
- **disconnect-cloud.ts**: Remove cloud provider connection
- **update-cloud-credentials.ts**: Update existing cloud credentials
- **run-tests.ts**: Trigger cloud security scans via Trigger.dev

### API Routes

- **GET /api/cloud-tests/[orgId]/findings**: Fetch findings for useSWR
- **GET /api/cloud-tests/[orgId]/providers**: Fetch providers for useSWR

## Data Flow

### Connection Flow

1. User enters credentials in CloudConnectionCard
2. Server action encrypts credentials using `@/lib/encryption`
3. Creates/updates Integration record in database
4. Triggers immediate scan via Trigger.dev
5. useSWR updates UI with new data

### Scan Flow

1. User clicks "Run Scan" button
2. Trigger.dev task `run-integration-tests` is invoked
3. Task fetches findings from cloud provider APIs (AWS Security Hub, GCP Security Command Center, Azure Security Center)
4. Results stored in IntegrationResult table
5. useSWR automatically refreshes findings (5s interval during scan)

## UX States

1. **No Clouds Connected**: Show EmptyState with connection cards
2. **Single Cloud (95% use case)**: Clean results view with settings gear icon tucked away
3. **Multi-Cloud (<5%)**: Tabs for each provider with "+" to add more
4. **Empty Results**: Contextual messages (never scanned, scanning, no issues, failed)

## Database Schema

Uses existing tables:

- **Integration**: Stores cloud connections and encrypted credentials
- **IntegrationResult**: Stores security findings from scans

## Security

- All credentials encrypted with AES-256-GCM via `@/lib/encryption`
- Server actions use `authActionClient` for authentication
- Credentials only decrypted in server-side Trigger.dev tasks
- Never exposed to client-side code

## Testing Checklist

- [ ] First-time user: No clouds connected → EmptyState shows
- [ ] Connect AWS with valid credentials → Scan runs automatically
- [ ] Connect GCP with valid credentials → Scan runs automatically
- [ ] Connect Azure with valid credentials → Scan runs automatically
- [ ] Single cloud user: Clean UI without clutter
- [ ] Multi-cloud user: Tabs show for each provider
- [ ] Click "+" to add another cloud provider
- [ ] Settings modal: Update credentials
- [ ] Settings modal: Disconnect cloud provider
- [ ] Findings table: Expand row to see remediation
- [ ] Filters: Filter by severity and status
- [ ] Sort: Click severity badge to sort
- [ ] Empty results: Appropriate message shown
- [ ] Scan button: Shows loading state during scan
- [ ] useSWR: Real-time updates when scan completes
- [ ] Chat placeholder: Shows on right side (>lg breakpoint)

## Future Enhancements

- AI Remediation Chat: Replace ChatPlaceholder with functional AI assistant
- Batch remediation: Select multiple findings and fix at once
- Compliance frameworks: Map findings to specific compliance requirements (SOC 2, ISO 27001, etc.)
- Historical trends: Show security posture over time
- Notifications: Alert when new critical findings appear
