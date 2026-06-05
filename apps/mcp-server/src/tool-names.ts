// Auto-generated at build time
export const toolNames: Array<{ name: string; description: string }>= [
  {
    "name": "get-organization",
    "description": "Get organization profile\n\nRetrieve organization profile data used to personalize compliance workflows, Trust Center branding, API automation, and audit readiness reporting."
  },
  {
    "name": "update-organization",
    "description": "Update organization\n\nPartially updates the authenticated organization. Only provided fields will be updated."
  },
  {
    "name": "delete-organization",
    "description": "Delete organization\n\nPermanently deletes the authenticated organization. This action cannot be undone."
  },
  {
    "name": "get-onboarding",
    "description": "Get organization onboarding status\n\nGet organization onboarding status in Comp AI. Manage organization profile data, API keys, logos, ownership, role notifications, and access approval settings."
  },
  {
    "name": "transfer-ownership",
    "description": "Transfer organization ownership\n\nTransfers organization ownership to another member. The current owner will become an admin and keep all other roles. The new owner will receive the owner role while keeping their existing roles. Only the current organization owner can."
  },
  {
    "name": "update-role-notifications",
    "description": "Update role notification settings\n\nUpdate role notification settings in Comp AI. Manage organization profile data, API keys, logos, ownership, role notifications, and access approval settings."
  },
  {
    "name": "get-role-notifications",
    "description": "Get role notification settings\n\nGet role notification settings in Comp AI. Manage organization profile data, API keys, logos, ownership, role notifications, and access approval settings."
  },
  {
    "name": "list-api-keys",
    "description": "List API keys\n\nList active API keys for an organization so administrators can audit automation access and rotate credentials safely."
  },
  {
    "name": "create-api-key",
    "description": "Create API key\n\nCreate a scoped API key for server-side compliance automation such as evidence sync, policy workflows, or security questionnaire tooling."
  },
  {
    "name": "get-available-scopes",
    "description": "List API key scopes\n\nRetrieve available API key scopes and permissions before creating credentials for a specific compliance automation workflow."
  },
  {
    "name": "get-primary-color",
    "description": "Get organization brand color\n\nRetrieve the organization primary brand color used for Trust Center theming, portals, and API-driven embedded experiences."
  },
  {
    "name": "upload-logo",
    "description": "Upload organization logo\n\nUpload organization logo in Comp AI. Manage organization profile data, API keys, logos, ownership, role notifications, and access approval settings."
  },
  {
    "name": "remove-logo",
    "description": "Remove organization logo\n\nRemove organization logo in Comp AI. Manage organization profile data, API keys, logos, ownership, role notifications, and access approval settings."
  },
  {
    "name": "revoke-api-key",
    "description": "Revoke API key\n\nRevoke an organization API key when an integration is retired, credentials rotate, or access should be removed."
  },
  {
    "name": "auto-approve",
    "description": "Auto-approve organization access via domain or self-hosted check\n\nGrants hasAccess on the active organization if the requesting user is an internal trycomp.ai user, the deployment is self-hosted, or the user email domain matches the organization website domain and is an active Stripe customer."
  },
  {
    "name": "invite-members",
    "description": "Invite workforce members\n\nInvite employees or contractors to complete portal tasks, training, device setup, and compliance evidence requirements."
  },
  {
    "name": "list-members",
    "description": "List workforce members\n\nList employees and contractors with onboarding, training, device, and compliance status used for people-security controls."
  },
  {
    "name": "create-member",
    "description": "Create a new member\n\nAdds a new member to the authenticated organization. The user must already exist in the system."
  },
  {
    "name": "get-devices",
    "description": "Get all employee devices with fleet compliance data\n\nGet all employee devices with fleet compliance data in Comp AI. Invite and manage workforce members, training status, device compliance, email preferences, and employee evidence records."
  },
  {
    "name": "get-test-stats-by-assignee",
    "description": "Get integration test statistics grouped by assignee\n\nGet integration test statistics grouped by assignee in Comp AI. Invite and manage workforce members, training status, device compliance, email preferences, and employee evidence records."
  },
  {
    "name": "bulk-create-members",
    "description": "Add multiple members to organization\n\nBulk adds multiple members to the authenticated organization. Each member must have a valid user ID that exists in the system. Members who already exist in the organization or have invalid data will be skipped with error details returned."
  },
  {
    "name": "get-mentionable-members",
    "description": "Get members who can read a specific resource type\n\nGet members who can read a specific resource type in Comp AI. Invite and manage workforce members, training status, device compliance, email preferences, and employee evidence records."
  },
  {
    "name": "reactivate-member",
    "description": "Reactivate a deactivated member\n\nReactivate a deactivated member in Comp AI. Invite and manage workforce members, training status, device compliance, email preferences, and employee evidence records."
  },
  {
    "name": "get-member",
    "description": "Get person by ID\n\nReturns a specific member by ID for the authenticated organization with their user information."
  },
  {
    "name": "update-member",
    "description": "Update workforce member\n\nUpdate a workforce member profile, role, department, or compliance metadata used for people-security controls."
  },
  {
    "name": "delete-member",
    "description": "Delete member\n\nPermanently removes a member from the organization. This action cannot be undone."
  },
  {
    "name": "get-training-videos",
    "description": "Get training video completions for a member\n\nGet training video completions for a member in Comp AI. Invite and manage workforce members, training status, device compliance, email preferences, and employee evidence records."
  },
  {
    "name": "get-fleet-compliance",
    "description": "Get fleet compliance\n\nRetrieve Fleet device compliance status so endpoint security findings can support people-security controls and audit evidence."
  },
  {
    "name": "remove-host",
    "description": "Remove host (device) from Fleet\n\nRemoves a single host (device) from FleetDM by host ID. Only organization owners can perform this action. Validates that the organization exists and the member exists within the organization."
  },
  {
    "name": "resend-portal-invite",
    "description": "Resend portal invite email to a member\n\nResend portal invite email to a member in Comp AI. Invite and manage workforce members, training status, device compliance, email preferences, and employee evidence records."
  },
  {
    "name": "unlink-device",
    "description": "Unlink device from member\n\nResets the fleetDmLabelId for a member, effectively unlinking their device from FleetDM. This will disconnect the device from the organization."
  },
  {
    "name": "get-employment-evidence",
    "description": "Get employment evidence attachments\n\nGet employment evidence attachments in Comp AI. Invite and manage workforce members, training status, device compliance, email preferences, and employee evidence records."
  },
  {
    "name": "upload-employment-evidence",
    "description": "Upload employment evidence\n\nUpload employment evidence in Comp AI. Invite and manage workforce members, training status, device compliance, email preferences, and employee evidence records."
  },
  {
    "name": "delete-employment-evidence",
    "description": "Delete employment evidence\n\nDelete employment evidence in Comp AI. Invite and manage workforce members, training status, device compliance, email preferences, and employee evidence records."
  },
  {
    "name": "get-email-preferences",
    "description": "Get current user email notification preferences\n\nGet current user email notification preferences in Comp AI. Invite and manage workforce members, training status, device compliance, email preferences, and employee evidence records."
  },
  {
    "name": "update-email-preferences",
    "description": "Update current user email notification preferences\n\nUpdate current user email notification preferences in Comp AI. Invite and manage workforce members, training status, device compliance, email preferences, and employee evidence records."
  },
  {
    "name": "create-attachment",
    "description": "Upload an attachment to any supported entity\n\nUpload a base64-encoded file and attach it to a task, vendor, risk, comment, or other supported entity type. The file is uploaded to S3 and a database record is created."
  },
  {
    "name": "get-attachment-download-url",
    "description": "Get shared attachment download URL\n\nGenerate a signed download URL for a shared attachment linked to comments, evidence records, or compliance workflow reviews."
  },
  {
    "name": "create-upload-url",
    "description": "Get a presigned URL to upload a file\n\nReturns a presigned S3 URL plus the s3Key the file lands at. PUT the raw file bytes to that URL, then call the feature tool (e.g. upload-and-parse) with the s3Key instead of sending file data. Bytes never pass through the LLM."
  },
  {
    "name": "get-all-risks",
    "description": "List organization risks\n\nList organization risks with owners, departments, severity, mitigation status, and evidence for risk management reporting."
  },
  {
    "name": "create-risk",
    "description": "Create organization risk\n\nCreate a risk record with ownership and context so compliance teams can track mitigation and remediation work."
  },
  {
    "name": "get-stats-by-assignee",
    "description": "Get risk statistics grouped by assignee\n\nGet risk statistics grouped by assignee in Comp AI. Create, update, and report on organizational risks with ownership, departments, and compliance remediation status."
  },
  {
    "name": "get-stats-by-department",
    "description": "Get risk counts grouped by department\n\nGet risk counts grouped by department in Comp AI. Create, update, and report on organizational risks with ownership, departments, and compliance remediation status."
  },
  {
    "name": "get-risk-by-id",
    "description": "Get organization risk\n\nRetrieve one organization risk with owner, department, likelihood, impact, mitigation, and remediation context."
  },
  {
    "name": "update-risk",
    "description": "Update organization risk\n\nUpdate a risk record as mitigation work progresses so compliance reports reflect the current risk posture."
  },
  {
    "name": "delete-risk",
    "description": "Delete organization risk\n\nDelete an organization risk that no longer needs active tracking in the risk register or compliance program."
  },
  {
    "name": "search-global-vendors",
    "description": "Search global vendors\n\nSearch global vendor records to prefill vendor profiles and speed up third-party risk assessment workflows."
  },
  {
    "name": "get-all-vendors",
    "description": "List vendors\n\nList third-party vendors with risk level, owner, assessment status, and Trust Center visibility for vendor risk management."
  },
  {
    "name": "create-vendor",
    "description": "Create vendor\n\nCreate a vendor record so teams can track third-party risk, assessment evidence, owner, category, and compliance status."
  },
  {
    "name": "get-vendor-by-id",
    "description": "Get vendor details\n\nRetrieve one vendor record with ownership, review status, risk context, and third-party compliance metadata."
  },
  {
    "name": "update-vendor",
    "description": "Update vendor record\n\nUpdate vendor ownership, risk attributes, review metadata, and third-party compliance context for an organization."
  },
  {
    "name": "delete-vendor",
    "description": "Delete vendor\n\nPermanently removes a vendor from the organization. This action cannot be undone."
  },
  {
    "name": "trigger-assessment",
    "description": "Trigger vendor risk assessment\n\nTrigger a vendor risk assessment so Comp AI can update third-party risk evidence and vendor security review status."
  },
  {
    "name": "get-all-context",
    "description": "List organization context\n\nList organization context entries used as approved source material for evidence, questionnaires, policies, and AI workflows."
  },
  {
    "name": "create-context",
    "description": "Create a new context entry\n\nCreates a new context entry for the authenticated organization. All required fields must be provided."
  },
  {
    "name": "get-context-by-id",
    "description": "Get organization context\n\nRetrieve one organization context entry with source details and approved content for compliance automation workflows."
  },
  {
    "name": "update-context",
    "description": "Update organization context\n\nUpdate an organization context entry so approved business details stay current for evidence and questionnaire automation."
  },
  {
    "name": "delete-context",
    "description": "Delete context entry\n\nPermanently removes a context entry from the organization. This action cannot be undone."
  },
  {
    "name": "get-all-devices",
    "description": "List managed devices\n\nList managed employee devices with endpoint compliance status, ownership, and security check results for workforce controls."
  },
  {
    "name": "get-devices-by-member",
    "description": "Get devices by member ID\n\nReturns all devices assigned to a specific member within the authenticated organization. Devices are fetched from FleetDM using the member's dedicated fleetDmLabelId."
  },
  {
    "name": "delete-device",
    "description": "Delete device\n\nDelete device in Comp AI. Read and manage employee device inventory and Fleet compliance data used for endpoint security controls."
  },
  {
    "name": "list-policies",
    "description": "List compliance policies\n\nLists active compliance policies by default. Use includeArchived=true to include archived rows and excludeContent=true when you only need policy metadata."
  },
  {
    "name": "create-policy",
    "description": "Create compliance policy\n\nCreate a policy record that can be reviewed, versioned, published, linked to controls, and used as source evidence for questionnaires."
  },
  {
    "name": "publish-all-policies",
    "description": "Publish all draft policies\n\nPublish draft policies in bulk so approved policy content can power Trust Center sharing, questionnaire answers, and audit evidence."
  },
  {
    "name": "download-all-policies",
    "description": "Download all published policies\n\nGenerate a single PDF bundle of published compliance policies for auditors, customer security reviews, and Trust Center workflows."
  },
  {
    "name": "get-policy-controls",
    "description": "Get mapped and all controls for a policy\n\nGet mapped and all controls for a policy in Comp AI. Create, version, publish, export, map, and improve compliance policies with AI-assisted drafting and approval workflows."
  },
  {
    "name": "add-policy-controls",
    "description": "Map controls to a policy\n\nMap controls to a policy in Comp AI. Create, version, publish, export, map, and improve compliance policies with AI-assisted drafting and approval workflows."
  },
  {
    "name": "get-policy-evidence-tasks",
    "description": "Get tasks that serve as evidence for a policy, grouped by control\n\nGet tasks that serve as evidence for a policy, grouped by control in Comp AI. Create, version, publish, export, map, and improve compliance policies with AI-assisted drafting and approval workflows."
  },
  {
    "name": "regenerate-policy",
    "description": "Regenerate policy with AI\n\nRegenerate policy content using Comp AI while keeping the result reviewable before it is published or used as compliance evidence."
  },
  {
    "name": "get-pdf-signed-url",
    "description": "Get a signed URL for the policy PDF\n\nGet a signed URL for the policy PDF in Comp AI. Create, version, publish, export, map, and improve compliance policies with AI-assisted drafting and approval workflows."
  },
  {
    "name": "delete-policy-pdf",
    "description": "Delete a policy version PDF\n\nDeletes the PDF from a specific policy version. If no versionId is provided, deletes from the latest draft version. Cannot delete PDFs from published or pending-approval versions."
  },
  {
    "name": "request-policy-pdf-upload-url",
    "description": "Request a presigned URL to upload a policy PDF\n\nGenerates a presigned S3 URL for uploading a policy PDF directly to storage. Use this when attaching a PDF to a compliance policy — the file bytes are uploaded straight to S3 without passing through the API. Requires the policy ID; if you only know the policy name, look it up first via the list-compliance-policies tool. After uploading the file to the returned URL, finalize the attachment by calling confirm-policy-pdf-uploaded with the same s3Key."
  },
  {
    "name": "confirm-policy-pdf-uploaded",
    "description": "Confirm a policy PDF upload completed\n\nLinks an uploaded PDF to a compliance policy after the file has been PUT to a presigned S3 URL. Call this after request-policy-pdf-upload-url returned an s3Key and you successfully uploaded the file bytes to that URL. The endpoint verifies the file exists in S3 before linking it to the policy or version."
  },
  {
    "name": "get-pdf-url",
    "description": "Get signed URL for policy PDF (alternate path)\n\nGet signed URL for policy PDF (alternate path) in Comp AI. Create, version, publish, export, map, and improve compliance policies with AI-assisted drafting and approval workflows."
  },
  {
    "name": "remove-policy-control",
    "description": "Remove a control mapping from a policy\n\nRemove a control mapping from a policy in Comp AI. Create, version, publish, export, map, and improve compliance policies with AI-assisted drafting and approval workflows."
  },
  {
    "name": "get-policy",
    "description": "Get compliance policy\n\nRetrieve a single compliance policy by its ID, including current content, draft content, review status, framework links, and audit metadata. Use this to read or inspect one policy in detail. If you only have a policy name, find its ID first by listing compliance policies."
  },
  {
    "name": "update-policy",
    "description": "Update compliance policy\n\nUpdate compliance policy details or content while keeping policy workflows connected to controls, tasks, and approvals."
  },
  {
    "name": "delete-policy",
    "description": "Delete compliance policy\n\nDelete a compliance policy that is no longer part of the organization evidence library or control program."
  },
  {
    "name": "list-policy-versions",
    "description": "Get policy versions\n\nGet policy versions in Comp AI. Create, version, publish, export, map, and improve compliance policies with AI-assisted drafting and approval workflows."
  },
  {
    "name": "create-policy-version",
    "description": "Create policy version\n\nCreates a new draft version of a policy, cloned from the current published version (or a specified source version). Use this when you need to make any change to a published policy — content edits, PDF attachments, anything. Published."
  },
  {
    "name": "get-policy-version",
    "description": "Get policy version by ID\n\nGet policy version by ID in Comp AI. Create, version, publish, export, map, and improve compliance policies with AI-assisted drafting and approval workflows."
  },
  {
    "name": "update-policy-version-content",
    "description": "Update version content\n\nUpdate version content in Comp AI. Create, version, publish, export, map, and improve compliance policies with AI-assisted drafting and approval workflows."
  },
  {
    "name": "delete-policy-version",
    "description": "Delete policy version\n\nDelete policy version in Comp AI. Create, version, publish, export, map, and improve compliance policies with AI-assisted drafting and approval workflows."
  },
  {
    "name": "publish-policy-version",
    "description": "Publish policy version\n\nPublishes a draft policy version, making it the active/current version of the policy. Pass the versionId of the draft you want to publish — for example one created via create-policy-version and then edited."
  },
  {
    "name": "set-active-policy-version",
    "description": "Set active policy version\n\nSet active policy version in Comp AI. Create, version, publish, export, map, and improve compliance policies with AI-assisted drafting and approval workflows."
  },
  {
    "name": "submit-policy-version-for-approval",
    "description": "Submit version for approval\n\nSubmit version for approval in Comp AI. Create, version, publish, export, map, and improve compliance policies with AI-assisted drafting and approval workflows."
  },
  {
    "name": "accept-policy-changes",
    "description": "Accept pending policy changes and publish the version\n\nAccept pending policy changes and publish the version in Comp AI. Create, version, publish, export, map, and improve compliance policies with AI-assisted drafting and approval workflows."
  },
  {
    "name": "deny-policy-changes",
    "description": "Deny pending policy changes\n\nDeny pending policy changes in Comp AI. Create, version, publish, export, map, and improve compliance policies with AI-assisted drafting and approval workflows."
  },
  {
    "name": "ai-chat-policy",
    "description": "Chat with AI about a policy\n\nAsk policy-specific questions and request draft improvements while preserving human review before policy changes are applied."
  },
  {
    "name": "exchange-code",
    "description": "Exchange an auth code for device credentials\n\nExchange an auth code for device credentials in Comp AI. Register employee devices, submit device compliance check-ins, download agent builds, and manage endpoint security status."
  },
  {
    "name": "get-update-file",
    "description": "Download a device-agent update\n\nDownload a device-agent update in Comp AI. Register employee devices, submit device compliance check-ins, download agent builds, and manage endpoint security status."
  },
  {
    "name": "head-update-file",
    "description": "Check a device-agent update's metadata\n\nCheck a device-agent update's metadata in Comp AI. Register employee devices, submit device compliance check-ins, download agent builds, and manage endpoint security status."
  },
  {
    "name": "generate-auth-code",
    "description": "Create a device-agent auth code\n\nCreate a device-agent auth code in Comp AI. Register employee devices, submit device compliance check-ins, download agent builds, and manage endpoint security status."
  },
  {
    "name": "get-my-organizations",
    "description": "List organizations for the current device\n\nList organizations for the current device in Comp AI. Register employee devices, submit device compliance check-ins, download agent builds, and manage endpoint security status."
  },
  {
    "name": "register-device",
    "description": "Register device agent\n\nRegister a Comp AI Device Agent installation so employee endpoint checks can report into compliance tasks and device inventory."
  },
  {
    "name": "check-in",
    "description": "Submit device compliance check-in\n\nSubmit device security check results for encryption, antivirus, password policy, screen lock, and other endpoint controls."
  },
  {
    "name": "get-device-status",
    "description": "Get device-agent status\n\nGet device-agent status in Comp AI. Register employee devices, submit device compliance check-ins, download agent builds, and manage endpoint security status."
  },
  {
    "name": "download-mac-agent",
    "description": "Download macOS Device Agent\n\nDownloads the Comp AI Device Agent installer for macOS as a DMG file. The agent helps monitor device compliance and security policies."
  },
  {
    "name": "download-windows-agent",
    "description": "Download Windows Device Agent ZIP\n\nDownloads a ZIP package containing the Comp AI Device Agent installer for Windows, along with setup scripts and instructions. The package includes an MSI installer, setup batch script customized for the organization and user, and a README."
  },
  {
    "name": "revoke-agent-access",
    "description": "Revoke a device agent session\n\nRevoke a device agent session in Comp AI. Register employee devices, submit device compliance check-ins, download agent builds, and manage endpoint security status."
  },
  {
    "name": "get-tasks",
    "description": "List compliance tasks\n\nList compliance tasks with assignments and status so teams can track audit readiness, evidence work, and control implementation."
  },
  {
    "name": "create-task",
    "description": "Create compliance task\n\nCreate a compliance task for evidence collection, remediation, review, or recurring control work inside an organization."
  },
  {
    "name": "get-task-templates",
    "description": "Get task templates\n\nGet task templates in Comp AI. Manage compliance task lifecycle, assignments, review approvals, evidence uploads, policy links, and activity history."
  },
  {
    "name": "update-tasks-status",
    "description": "Update status for multiple tasks\n\nUpdate status for multiple tasks in Comp AI. Manage compliance task lifecycle, assignments, review approvals, evidence uploads, policy links, and activity history."
  },
  {
    "name": "delete-tasks",
    "description": "Delete multiple tasks\n\nDelete multiple tasks in Comp AI. Manage compliance task lifecycle, assignments, review approvals, evidence uploads, policy links, and activity history."
  },
  {
    "name": "update-tasks-assignee",
    "description": "Update assignee for multiple tasks\n\nUpdate assignee for multiple tasks in Comp AI. Manage compliance task lifecycle, assignments, review approvals, evidence uploads, policy links, and activity history."
  },
  {
    "name": "reorder-tasks",
    "description": "Reorder tasks\n\nReorder tasks in Comp AI. Manage compliance task lifecycle, assignments, review approvals, evidence uploads, policy links, and activity history."
  },
  {
    "name": "bulk-submit-for-review",
    "description": "Bulk submit tasks for review\n\nBulk submit tasks for review in Comp AI. Manage compliance task lifecycle, assignments, review approvals, evidence uploads, policy links, and activity history."
  },
  {
    "name": "get-task-options",
    "description": "Get page options for tasks overview\n\nGet page options for tasks overview in Comp AI. Manage compliance task lifecycle, assignments, review approvals, evidence uploads, policy links, and activity history."
  },
  {
    "name": "get-task",
    "description": "Get task by ID\n\nGet task by ID in Comp AI. Manage compliance task lifecycle, assignments, review approvals, evidence uploads, policy links, and activity history."
  },
  {
    "name": "update-task",
    "description": "Update a task\n\nUpdate a task in Comp AI. Manage compliance task lifecycle, assignments, review approvals, evidence uploads, policy links, and activity history."
  },
  {
    "name": "delete-task",
    "description": "Delete a task\n\nDelete a task in Comp AI. Manage compliance task lifecycle, assignments, review approvals, evidence uploads, policy links, and activity history."
  },
  {
    "name": "get-task-policies",
    "description": "Get policies that reference a task via shared controls\n\nGet policies that reference a task via shared controls in Comp AI. Manage compliance task lifecycle, assignments, review approvals, evidence uploads, policy links, and activity history."
  },
  {
    "name": "get-task-activity",
    "description": "Get task activity\n\nGet task activity in Comp AI. Manage compliance task lifecycle, assignments, review approvals, evidence uploads, policy links, and activity history."
  },
  {
    "name": "regenerate-task",
    "description": "Regenerate task from template\n\nRegenerate task from template in Comp AI. Manage compliance task lifecycle, assignments, review approvals, evidence uploads, policy links, and activity history."
  },
  {
    "name": "submit-for-review",
    "description": "Submit task for review\n\nSubmit task for review in Comp AI. Manage compliance task lifecycle, assignments, review approvals, evidence uploads, policy links, and activity history."
  },
  {
    "name": "approve-task",
    "description": "Approve a task\n\nApprove a task that is in review. Only the assigned approver can approve. Moves status to done and creates an audit comment."
  },
  {
    "name": "reject-task",
    "description": "Reject a task review\n\nReject a task that is in review. Only the assigned approver can reject. Reverts status to the previous status and creates an audit comment."
  },
  {
    "name": "get-task-attachments",
    "description": "Get task attachments\n\nGet task attachments in Comp AI. Manage compliance task lifecycle, assignments, review approvals, evidence uploads, policy links, and activity history."
  },
  {
    "name": "upload-task-attachment",
    "description": "Upload task evidence\n\nUpload an evidence attachment to a task so auditors and reviewers can trace completion back to source documentation."
  },
  {
    "name": "get-task-attachment-download-url",
    "description": "Get task attachment download URL\n\nGenerate a signed download URL for an attachment on a compliance task so reviewers can access uploaded evidence."
  },
  {
    "name": "delete-task-attachment",
    "description": "Delete task attachment\n\nDelete task attachment in Comp AI. Manage compliance task lifecycle, assignments, review approvals, evidence uploads, policy links, and activity history."
  },
  {
    "name": "get-task-automations",
    "description": "Get all automations for a task\n\nGet all automations for a task in Comp AI. Create, version, run, and inspect automated evidence collection workflows attached to compliance tasks."
  },
  {
    "name": "get-automation",
    "description": "Get automation details\n\nGet automation details in Comp AI. Create, version, run, and inspect automated evidence collection workflows attached to compliance tasks."
  },
  {
    "name": "update-automation",
    "description": "Update an existing automation\n\nUpdate an existing automation in Comp AI. Create, version, run, and inspect automated evidence collection workflows attached to compliance tasks."
  },
  {
    "name": "delete-automation",
    "description": "Delete an automation\n\nDelete an automation in Comp AI. Create, version, run, and inspect automated evidence collection workflows attached to compliance tasks."
  },
  {
    "name": "get-automation-runs",
    "description": "Get all runs for a specific automation\n\nGet all runs for a specific automation in Comp AI. Create, version, run, and inspect automated evidence collection workflows attached to compliance tasks."
  },
  {
    "name": "get-automation-versions",
    "description": "Get all versions for an automation\n\nGet all versions for an automation in Comp AI. Create, version, run, and inspect automated evidence collection workflows attached to compliance tasks."
  },
  {
    "name": "get-task-automation-runs",
    "description": "Get all automation runs for a task\n\nGet all automation runs for a task in Comp AI. Create, version, run, and inspect automated evidence collection workflows attached to compliance tasks."
  },
  {
    "name": "get-task-evidence-summary",
    "description": "Get task evidence summary\n\nGet task evidence summary in Comp AI. Export task evidence, automation evidence, and reviewer-ready evidence bundles as PDF or ZIP files."
  },
  {
    "name": "export-automation-pdf",
    "description": "Export automation evidence as PDF\n\nExport automation evidence as PDF in Comp AI. Export task evidence, automation evidence, and reviewer-ready evidence bundles as PDF or ZIP files."
  },
  {
    "name": "export-task-evidence-zip",
    "description": "Export task evidence as ZIP\n\nDownload a ZIP package containing task evidence and automation results for auditor review or customer security requests."
  },
  {
    "name": "export-all-evidence",
    "description": "Export all organization evidence as ZIP (Auditor only)\n\nExport all organization evidence as ZIP (Auditor only) in Comp AI. Export all organization evidence for an auditor review package."
  },
  {
    "name": "get-comments",
    "description": "Get comments for an entity\n\nGet comments for an entity in Comp AI. Create and manage collaboration comments on compliance entities such as tasks, policies, risks, vendors, and findings."
  },
  {
    "name": "create-comment",
    "description": "Create a new comment\n\nCreate a new comment in Comp AI. Create and manage collaboration comments on compliance entities such as tasks, policies, risks, vendors, and findings."
  },
  {
    "name": "update-comment",
    "description": "Update a comment\n\nUpdate a comment in Comp AI. Create and manage collaboration comments on compliance entities such as tasks, policies, risks, vendors, and findings."
  },
  {
    "name": "delete-comment",
    "description": "Delete a comment\n\nDelete a comment in Comp AI. Create and manage collaboration comments on compliance entities such as tasks, policies, risks, vendors, and findings."
  },
  {
    "name": "get-settings",
    "description": "Get Trust Center settings\n\nRetrieve Trust Center settings used to configure public status, custom domains, framework visibility, resources, FAQs, and access rules."
  },
  {
    "name": "upload-favicon",
    "description": "Upload a favicon for the trust portal\n\nUpload a favicon for the trust portal in Comp AI. Configure the live Trust Center, custom domain, public overview, FAQs, compliance resources, documents, links, and vendor disclosures."
  },
  {
    "name": "remove-favicon",
    "description": "Remove the trust portal favicon\n\nRemove the trust portal favicon in Comp AI. Configure the live Trust Center, custom domain, public overview, FAQs, compliance resources, documents, links, and vendor disclosures."
  },
  {
    "name": "get-domain-status",
    "description": "Get domain verification status\n\nGet domain verification status in Comp AI. Configure the live Trust Center, custom domain, public overview, FAQs, compliance resources, documents, links, and vendor disclosures."
  },
  {
    "name": "upload-compliance-resource",
    "description": "Upload compliance certificate\n\nUpload or replace a compliance certificate PDF such as SOC 2, ISO 27001, HIPAA, or GDPR evidence for Trust Center sharing."
  },
  {
    "name": "get-compliance-resource-url",
    "description": "Generate a temporary signed URL for a compliance certificate\n\nGenerate a temporary signed URL for a compliance certificate in Comp AI. Configure the live Trust Center, custom domain, public overview, FAQs, compliance resources, documents, links, and vendor disclosures."
  },
  {
    "name": "list-compliance-resources",
    "description": "List uploaded compliance certificates for the organization\n\nList uploaded compliance certificates for the organization in Comp AI. Configure the live Trust Center, custom domain, public overview, FAQs, compliance resources, documents, links, and vendor disclosures."
  },
  {
    "name": "upload-trust-document",
    "description": "Upload an additional trust portal document\n\nUpload an additional trust portal document in Comp AI. Configure the live Trust Center, custom domain, public overview, FAQs, compliance resources, documents, links, and vendor disclosures."
  },
  {
    "name": "list-trust-documents",
    "description": "List additional trust portal documents for the organization\n\nList additional trust portal documents for the organization in Comp AI. Configure the live Trust Center, custom domain, public overview, FAQs, compliance resources, documents, links, and vendor disclosures."
  },
  {
    "name": "get-trust-document-url",
    "description": "Generate a temporary signed URL for a trust portal document\n\nGenerate a temporary signed URL for a trust portal document in Comp AI. Configure the live Trust Center, custom domain, public overview, FAQs, compliance resources, documents, links, and vendor disclosures."
  },
  {
    "name": "delete-trust-document",
    "description": "Delete (deactivate) a trust portal document\n\nDelete (deactivate) a trust portal document in Comp AI. Configure the live Trust Center, custom domain, public overview, FAQs, compliance resources, documents, links, and vendor disclosures."
  },
  {
    "name": "toggle-portal",
    "description": "Enable or disable the trust portal\n\nEnable or disable the trust portal in Comp AI. Configure the live Trust Center, custom domain, public overview, FAQs, compliance resources, documents, links, and vendor disclosures."
  },
  {
    "name": "add-custom-domain",
    "description": "Add or update a custom domain for the trust portal\n\nAdd or update a custom domain for the trust portal in Comp AI. Configure the live Trust Center, custom domain, public overview, FAQs, compliance resources, documents, links, and vendor disclosures."
  },
  {
    "name": "check-dns-records",
    "description": "Check DNS records for a custom domain\n\nCheck DNS records for a custom domain in Comp AI. Configure the live Trust Center, custom domain, public overview, FAQs, compliance resources, documents, links, and vendor disclosures."
  },
  {
    "name": "update-faqs",
    "description": "Update trust portal FAQs\n\nUpdate trust portal FAQs in Comp AI. Configure the live Trust Center, custom domain, public overview, FAQs, compliance resources, documents, links, and vendor disclosures."
  },
  {
    "name": "update-allowed-domains",
    "description": "Update allowed domains for the trust portal\n\nUpdate allowed domains for the trust portal in Comp AI. Configure the live Trust Center, custom domain, public overview, FAQs, compliance resources, documents, links, and vendor disclosures."
  },
  {
    "name": "update-frameworks",
    "description": "Update trust portal framework settings\n\nUpdate trust portal framework settings in Comp AI. Configure the live Trust Center, custom domain, public overview, FAQs, compliance resources, documents, links, and vendor disclosures."
  },
  {
    "name": "update-overview",
    "description": "Update Trust Center overview\n\nUpdate the public Trust Center overview content that explains security posture and compliance status to prospects and customers."
  },
  {
    "name": "get-overview",
    "description": "Get trust portal overview\n\nGet trust portal overview in Comp AI. Configure the live Trust Center, custom domain, public overview, FAQs, compliance resources, documents, links, and vendor disclosures."
  },
  {
    "name": "create-custom-link",
    "description": "Create a custom link for trust portal\n\nCreate a custom link for trust portal in Comp AI. Configure the live Trust Center, custom domain, public overview, FAQs, compliance resources, documents, links, and vendor disclosures."
  },
  {
    "name": "list-custom-links",
    "description": "List custom links for trust portal\n\nList custom links for trust portal in Comp AI. Configure the live Trust Center, custom domain, public overview, FAQs, compliance resources, documents, links, and vendor disclosures."
  },
  {
    "name": "update-custom-link",
    "description": "Update a custom link\n\nUpdate a custom link in Comp AI. Configure the live Trust Center, custom domain, public overview, FAQs, compliance resources, documents, links, and vendor disclosures."
  },
  {
    "name": "delete-custom-link",
    "description": "Delete a custom link\n\nDelete a custom link in Comp AI. Configure the live Trust Center, custom domain, public overview, FAQs, compliance resources, documents, links, and vendor disclosures."
  },
  {
    "name": "reorder-custom-links",
    "description": "Reorder custom links\n\nReorder custom links in Comp AI. Configure the live Trust Center, custom domain, public overview, FAQs, compliance resources, documents, links, and vendor disclosures."
  },
  {
    "name": "update-vendor-trust-settings",
    "description": "Update vendor trust portal settings\n\nUpdate vendor trust portal settings in Comp AI. Configure the live Trust Center, custom domain, public overview, FAQs, compliance resources, documents, links, and vendor disclosures."
  },
  {
    "name": "list-vendors",
    "description": "List vendors configured for trust portal\n\nList vendors configured for trust portal in Comp AI. Configure the live Trust Center, custom domain, public overview, FAQs, compliance resources, documents, links, and vendor disclosures."
  },
  {
    "name": "create-access-request",
    "description": "Submit Trust Access request\n\nSubmit a Trust Center access request with requester details, company context, and review reason for administrator approval."
  },
  {
    "name": "list-access-requests",
    "description": "List Trust Access requests\n\nList pending and completed Trust Center access requests so teams can review customer security inquiries through the API."
  },
  {
    "name": "get-access-request",
    "description": "Get Trust Access request\n\nRetrieve one Trust Center access request with requester context, status, review metadata, and audit details."
  },
  {
    "name": "approve-request",
    "description": "Approve Trust Access request\n\nApprove a Trust Center access request, configure the grant window, and start the NDA or access email workflow."
  },
  {
    "name": "deny-request",
    "description": "Deny Trust Access request\n\nReject a Trust Center access request with a review reason so customer security access decisions stay auditable."
  },
  {
    "name": "list-grants",
    "description": "List Trust Access grants\n\nList active, expired, and revoked Trust Access grants for customer security reviews and shared compliance resources."
  },
  {
    "name": "revoke-grant",
    "description": "Revoke Trust Access grant\n\nImmediately revoke a Trust Access grant when a customer review ends or shared compliance access should be removed."
  },
  {
    "name": "resend-access-email",
    "description": "Resend Trust Access email\n\nResend the access email for an active Trust Access grant so approved reviewers can reopen shared resources."
  },
  {
    "name": "resend-nda",
    "description": "Resend Trust Access NDA\n\nResend an NDA signing email for a Trust Access request that still requires reviewer signature."
  },
  {
    "name": "preview-nda",
    "description": "Preview Trust Access NDA\n\nGenerate a preview NDA PDF for a Trust Access request before the reviewer signs and receives access."
  },
  {
    "name": "reclaim-access",
    "description": "Reclaim Trust Access link\n\nRequest a fresh Trust Access link for a reviewer who already has an active grant on a published Trust Center."
  },
  {
    "name": "get-faqs",
    "description": "Get Trust Center FAQs\n\nRetrieve published Trust Center FAQs for an organization so public trust pages can show customer security answers."
  },
  {
    "name": "get-public-overview",
    "description": "Get Trust Center overview\n\nRetrieve the published Trust Center overview for an organization, including public security posture messaging."
  },
  {
    "name": "get-public-custom-links",
    "description": "List Trust Center custom links\n\nList published custom links shown on an organization Trust Center for customer security and compliance reviews."
  },
  {
    "name": "get-public-favicon",
    "description": "Get Trust Center favicon\n\nRetrieve the favicon URL used by a published Trust Center so embedded or mirrored experiences can match branding."
  },
  {
    "name": "get-public-vendors",
    "description": "List Trust Center vendors\n\nList published vendors and subprocessors for an organization Trust Center so reviewers can inspect third-party posture."
  },
  {
    "name": "list-findings",
    "description": "List audit findings\n\nList audit findings with status, severity, owner, history, and remediation context for compliance review workflows."
  },
  {
    "name": "create-finding",
    "description": "Create audit finding\n\nCreate an audit finding so teams can track issue ownership, remediation activity, severity, and supporting evidence."
  },
  {
    "name": "get-organization-findings",
    "description": "List all findings for the organization\n\nList all findings for the organization in Comp AI. Create, review, update, and track audit findings, remediation activity, and finding history for an organization."
  },
  {
    "name": "get-finding-by-id",
    "description": "Get finding by ID\n\nGet finding by ID in Comp AI. Create, review, update, and track audit findings, remediation activity, and finding history for an organization."
  },
  {
    "name": "update-finding",
    "description": "Update a finding (status transition rules apply)\n\nUpdate a finding (status transition rules apply) in Comp AI. Create, review, update, and track audit findings, remediation activity, and finding history for an organization."
  },
  {
    "name": "delete-finding",
    "description": "Delete a finding (auditor or platform admin only)\n\nDelete a finding (auditor or platform admin only) in Comp AI. Create, review, update, and track audit findings, remediation activity, and finding history for an organization."
  },
  {
    "name": "get-finding-history",
    "description": "Get activity history for a finding\n\nGet activity history for a finding in Comp AI. Create, review, update, and track audit findings, remediation activity, and finding history for an organization."
  },
  {
    "name": "create-role",
    "description": "Create a custom role\n\nCreate a custom role in Comp AI. Create custom roles and resolve permission sets for organization-level access control."
  },
  {
    "name": "list-roles",
    "description": "List all roles\n\nList all roles in Comp AI. Create custom roles and resolve permission sets for organization-level access control."
  },
  {
    "name": "get-permissions-for-roles",
    "description": "Resolve permissions for custom roles\n\nReturns the merged permissions for the given custom role names. Used by the frontend to resolve effective permissions for users with custom roles."
  },
  {
    "name": "get-built-in-obligations",
    "description": "Get obligations for a built-in role\n\nReturns the effective obligations for a built-in role (owner, admin, auditor, employee, contractor) — DB override if present, else the hardcoded default."
  },
  {
    "name": "update-built-in-obligations",
    "description": "Update obligations for a built-in role\n\nOverride the obligations for a built-in role (e.g., turn off the compliance obligation for owners). Permissions stay sourced from the hardcoded defaults."
  },
  {
    "name": "get-role",
    "description": "Get a role by ID\n\nGet a role by ID in Comp AI. Create custom roles and resolve permission sets for organization-level access control."
  },
  {
    "name": "update-role",
    "description": "Update a custom role\n\nUpdate a custom role in Comp AI. Create custom roles and resolve permission sets for organization-level access control."
  },
  {
    "name": "delete-role",
    "description": "Delete a custom role\n\nDelete a custom role in Comp AI. Create custom roles and resolve permission sets for organization-level access control."
  },
  {
    "name": "questionnaire-find-all",
    "description": "List security questionnaires\n\nList saved security questionnaires for an organization so teams can track customer reviews, answer status, and response history."
  },
  {
    "name": "find-by-id",
    "description": "Get security questionnaire details\n\nRetrieve one saved security questionnaire, including extracted questions, generated answers, and review context for the requesting client."
  },
  {
    "name": "delete-by-id",
    "description": "Delete a security questionnaire\n\nDelete a saved security questionnaire when a customer review or vendor assessment no longer needs to be retained."
  },
  {
    "name": "generate-questionnaire-answers",
    "description": "Generate answers for a questionnaire\n\nStarts background answer generation for an already-parsed questionnaire and returns a run handle immediately. Poll GET /v1/questionnaire/:id until answeredQuestions equals totalQuestions, then read the answers from its questions."
  },
  {
    "name": "parse-questionnaire",
    "description": "Parse questionnaire content\n\nParse questionnaire content from a submitted payload so teams can extract security questions before generating or reviewing answers."
  },
  {
    "name": "answer-single-question",
    "description": "Answer one questionnaire question\n\nGenerate an answer for one security questionnaire item using the organization evidence library and return source references for review."
  },
  {
    "name": "save-answer",
    "description": "Save questionnaire answer\n\nSave a manual or AI-generated security questionnaire answer for later review, export, and audit tracking."
  },
  {
    "name": "delete-answer",
    "description": "Delete questionnaire answer\n\nDelete a stored questionnaire answer when it should be removed from the active response set."
  },
  {
    "name": "export-by-id",
    "description": "Export a security questionnaire\n\nExport a saved security questionnaire response package as PDF, CSV, or XLSX for customer and vendor security reviews."
  },
  {
    "name": "upload-and-parse",
    "description": "Start questionnaire parsing\n\nUpload a questionnaire payload and start asynchronous parsing, returning a run ID for real-time progress tracking."
  },
  {
    "name": "list-documents",
    "description": "List knowledge base documents\n\nList uploaded knowledge base documents that Comp AI can use as approved source material for answers, policies, and reviews."
  },
  {
    "name": "list-manual-answers",
    "description": "List all manual answers for an organization\n\nList all manual answers for an organization in Comp AI. Upload source documents, process them for retrieval, and manage reusable manual answers that power questionnaires and AI policy workflows."
  },
  {
    "name": "save-manual-answer",
    "description": "Save reusable manual answer\n\nSave or update a reusable manual answer for security questionnaires that need approved, consistent response language."
  },
  {
    "name": "upload-document",
    "description": "Upload knowledge base document\n\nUpload supporting documentation so Comp AI can process approved source material for questionnaire answers and policy workflows."
  },
  {
    "name": "get-download-url",
    "description": "Get a signed download URL for a document\n\nGet a signed download URL for a document in Comp AI. Upload source documents, process them for retrieval, and manage reusable manual answers that power questionnaires and AI policy workflows."
  },
  {
    "name": "get-view-url",
    "description": "Get a signed view URL for a document\n\nGet a signed view URL for a document in Comp AI. Upload source documents, process them for retrieval, and manage reusable manual answers that power questionnaires and AI policy workflows."
  },
  {
    "name": "delete-document",
    "description": "Delete a knowledge base document\n\nDelete a knowledge base document in Comp AI. Upload source documents, process them for retrieval, and manage reusable manual answers that power questionnaires and AI policy workflows."
  },
  {
    "name": "process-documents",
    "description": "Process knowledge base documents\n\nStart document processing so uploaded knowledge base files become searchable source material for AI-assisted compliance workflows."
  },
  {
    "name": "create-run-token",
    "description": "Create a public access token for a run\n\nCreate a public access token for a run in Comp AI. Upload source documents, process them for retrieval, and manage reusable manual answers that power questionnaires and AI policy workflows."
  },
  {
    "name": "delete-manual-answer",
    "description": "Delete a manual answer\n\nDelete a manual answer in Comp AI. Upload source documents, process them for retrieval, and manage reusable manual answers that power questionnaires and AI policy workflows."
  },
  {
    "name": "delete-all-manual-answers",
    "description": "Delete all manual answers for an organization\n\nDelete all manual answers for an organization in Comp AI. Upload source documents, process them for retrieval, and manage reusable manual answers that power questionnaires and AI policy workflows."
  },
  {
    "name": "soa-save-answer",
    "description": "Save a SOA answer\n\nSave a SOA answer in Comp AI. Create, auto-fill, review, approve, and export ISO 27001 Statement of Applicability documents."
  },
  {
    "name": "auto-fill",
    "description": "Auto-fill ISO 27001 SOA\n\nAuto-fill a Statement of Applicability draft using organization context and framework mappings for ISO 27001 review."
  },
  {
    "name": "create-document",
    "description": "Create a new SOA document\n\nCreate a new SOA document in Comp AI. Create, auto-fill, review, approve, and export ISO 27001 Statement of Applicability documents."
  },
  {
    "name": "ensure-setup",
    "description": "Ensure SOA configuration and document exist\n\nEnsure SOA configuration and document exist in Comp AI. Create, auto-fill, review, approve, and export ISO 27001 Statement of Applicability documents."
  },
  {
    "name": "get-setup",
    "description": "Read SOA configuration and document without creating either\n\nRead SOA configuration and document without creating either in Comp AI. Create, auto-fill, review, approve, and export ISO 27001 Statement of Applicability documents."
  },
  {
    "name": "approve-document",
    "description": "Approve a SOA document\n\nApprove a SOA document in Comp AI. Create, auto-fill, review, approve, and export ISO 27001 Statement of Applicability documents."
  },
  {
    "name": "decline-document",
    "description": "Decline a SOA document\n\nDecline a SOA document in Comp AI. Create, auto-fill, review, approve, and export ISO 27001 Statement of Applicability documents."
  },
  {
    "name": "submit-for-approval",
    "description": "Submit SOA document for approval\n\nSubmit SOA document for approval in Comp AI. Create, auto-fill, review, approve, and export ISO 27001 Statement of Applicability documents."
  },
  {
    "name": "export-document",
    "description": "Export ISO 27001 SOA\n\nExport the approved Statement of Applicability document for ISO 27001 auditors, customer reviews, and internal records."
  },
  {
    "name": "list-providers",
    "description": "List integration providers\n\nList available integration providers that can connect to the organization for automated evidence collection and compliance checks."
  },
  {
    "name": "get-provider",
    "description": "Get an integration provider by slug\n\nGet an integration provider by slug in Comp AI. Connect vendor systems, configure OAuth apps, run compliance checks, sync employees, manage variables, and collect automated evidence."
  },
  {
    "name": "list-connections",
    "description": "List integration connections\n\nList integration connections in Comp AI. Connect vendor systems, configure OAuth apps, run compliance checks, sync employees, manage variables, and collect automated evidence."
  },
  {
    "name": "create-connection",
    "description": "Create integration connection\n\nCreate an integration connection so Comp AI can collect evidence, run checks, or sync data from a connected provider."
  },
  {
    "name": "get-connection",
    "description": "Get an integration connection by ID\n\nGet an integration connection by ID in Comp AI. Connect vendor systems, configure OAuth apps, run compliance checks, sync employees, manage variables, and collect automated evidence."
  },
  {
    "name": "delete-connection",
    "description": "Delete an integration connection\n\nDelete an integration connection in Comp AI. Connect vendor systems, configure OAuth apps, run compliance checks, sync employees, manage variables, and collect automated evidence."
  },
  {
    "name": "update-connection",
    "description": "Update an integration connection\n\nUpdate an integration connection in Comp AI. Connect vendor systems, configure OAuth apps, run compliance checks, sync employees, manage variables, and collect automated evidence."
  },
  {
    "name": "test-connection",
    "description": "Test an integration connection\n\nTest an integration connection in Comp AI. Connect vendor systems, configure OAuth apps, run compliance checks, sync employees, manage variables, and collect automated evidence."
  },
  {
    "name": "pause-connection",
    "description": "Pause an integration connection\n\nPause an integration connection in Comp AI. Connect vendor systems, configure OAuth apps, run compliance checks, sync employees, manage variables, and collect automated evidence."
  },
  {
    "name": "resume-connection",
    "description": "Resume an integration connection\n\nResume an integration connection in Comp AI. Connect vendor systems, configure OAuth apps, run compliance checks, sync employees, manage variables, and collect automated evidence."
  },
  {
    "name": "disconnect-connection",
    "description": "Disconnect an integration\n\nDisconnect an integration in Comp AI. Connect vendor systems, configure OAuth apps, run compliance checks, sync employees, manage variables, and collect automated evidence."
  },
  {
    "name": "update-connection-services",
    "description": "Set services enabled on a connection\n\nSet services enabled on a connection in Comp AI. Connect vendor systems, configure OAuth apps, run compliance checks, sync employees, manage variables, and collect automated evidence."
  },
  {
    "name": "get-connection-services",
    "description": "List services enabled on a connection\n\nList services enabled on a connection in Comp AI. Connect vendor systems, configure OAuth apps, run compliance checks, sync employees, manage variables, and collect automated evidence."
  },
  {
    "name": "list-provider-checks",
    "description": "List check definitions for a provider\n\nList check definitions for a provider in Comp AI. Connect vendor systems, configure OAuth apps, run compliance checks, sync employees, manage variables, and collect automated evidence."
  },
  {
    "name": "list-connection-checks",
    "description": "List checks for a connection\n\nList checks for a connection in Comp AI. Connect vendor systems, configure OAuth apps, run compliance checks, sync employees, manage variables, and collect automated evidence."
  },
  {
    "name": "run-connection-checks",
    "description": "Run integration checks\n\nRun all compliance checks for an integration connection and capture results as automated evidence."
  },
  {
    "name": "run-single-check",
    "description": "Run a single check on a connection\n\nRun a single check on a connection in Comp AI. Connect vendor systems, configure OAuth apps, run compliance checks, sync employees, manage variables, and collect automated evidence."
  },
  {
    "name": "get-provider-variables",
    "description": "List variable definitions for a provider\n\nList variable definitions for a provider in Comp AI. Connect vendor systems, configure OAuth apps, run compliance checks, sync employees, manage variables, and collect automated evidence."
  },
  {
    "name": "get-connection-variables",
    "description": "List connection variables\n\nList connection variables in Comp AI. Connect vendor systems, configure OAuth apps, run compliance checks, sync employees, manage variables, and collect automated evidence."
  },
  {
    "name": "save-connection-variables",
    "description": "Update connection variables\n\nUpdate connection variables in Comp AI. Connect vendor systems, configure OAuth apps, run compliance checks, sync employees, manage variables, and collect automated evidence."
  },
  {
    "name": "fetch-variable-options",
    "description": "Get options for a connection variable\n\nGet options for a connection variable in Comp AI. Connect vendor systems, configure OAuth apps, run compliance checks, sync employees, manage variables, and collect automated evidence."
  },
  {
    "name": "get-checks-for-task-template",
    "description": "List checks for a task template\n\nList checks for a task template in Comp AI. Connect vendor systems, configure OAuth apps, run compliance checks, sync employees, manage variables, and collect automated evidence."
  },
  {
    "name": "get-checks-for-task",
    "description": "List checks attached to a task\n\nList checks attached to a task in Comp AI. Connect vendor systems, configure OAuth apps, run compliance checks, sync employees, manage variables, and collect automated evidence."
  },
  {
    "name": "run-check-for-task",
    "description": "Run a check for a task\n\nRun a check for a task in Comp AI. Connect vendor systems, configure OAuth apps, run compliance checks, sync employees, manage variables, and collect automated evidence."
  },
  {
    "name": "disconnect-check-from-task",
    "description": "Disconnect checks from a task\n\nDisconnect checks from a task in Comp AI. Connect vendor systems, configure OAuth apps, run compliance checks, sync employees, manage variables, and collect automated evidence."
  },
  {
    "name": "reconnect-check-to-task",
    "description": "Reconnect checks to a task\n\nReconnect checks to a task in Comp AI. Connect vendor systems, configure OAuth apps, run compliance checks, sync employees, manage variables, and collect automated evidence."
  },
  {
    "name": "get-task-check-runs",
    "description": "List check runs for a task\n\nList check runs for a task in Comp AI. Connect vendor systems, configure OAuth apps, run compliance checks, sync employees, manage variables, and collect automated evidence."
  },
  {
    "name": "sync-google-workspace-employees",
    "description": "Sync Google Workspace employees\n\nSync Google Workspace employees in Comp AI. Connect vendor systems, configure OAuth apps, run compliance checks, sync employees, manage variables, and collect automated evidence."
  },
  {
    "name": "get-google-workspace-status",
    "description": "Get Google Workspace sync status\n\nGet Google Workspace sync status in Comp AI. Connect vendor systems, configure OAuth apps, run compliance checks, sync employees, manage variables, and collect automated evidence."
  },
  {
    "name": "sync-rippling-employees",
    "description": "Sync Rippling employees\n\nSync Rippling employees in Comp AI. Connect vendor systems, configure OAuth apps, run compliance checks, sync employees, manage variables, and collect automated evidence."
  },
  {
    "name": "get-rippling-status",
    "description": "Get Rippling sync status\n\nGet Rippling sync status in Comp AI. Connect vendor systems, configure OAuth apps, run compliance checks, sync employees, manage variables, and collect automated evidence."
  },
  {
    "name": "sync-jump-cloud-employees",
    "description": "Sync JumpCloud employees\n\nSync JumpCloud employees in Comp AI. Connect vendor systems, configure OAuth apps, run compliance checks, sync employees, manage variables, and collect automated evidence."
  },
  {
    "name": "get-jump-cloud-status",
    "description": "Get JumpCloud sync status\n\nGet JumpCloud sync status in Comp AI. Connect vendor systems, configure OAuth apps, run compliance checks, sync employees, manage variables, and collect automated evidence."
  },
  {
    "name": "get-employee-sync-provider",
    "description": "Get the currently configured employee sync provider\n\nGet the currently configured employee sync provider in Comp AI. Connect vendor systems, configure OAuth apps, run compliance checks, sync employees, manage variables, and collect automated evidence."
  },
  {
    "name": "set-employee-sync-provider",
    "description": "Set the employee sync provider\n\nSet the employee sync provider in Comp AI. Connect vendor systems, configure OAuth apps, run compliance checks, sync employees, manage variables, and collect automated evidence."
  },
  {
    "name": "get-device-sync-provider",
    "description": "Get the currently configured device sync provider\n\nGet the currently configured device sync provider in Comp AI. Connect vendor systems, configure OAuth apps, run compliance checks, sync employees, manage variables, and collect automated evidence."
  },
  {
    "name": "set-device-sync-provider",
    "description": "Set the device sync provider\n\nSet the device sync provider in Comp AI. Connect vendor systems, configure OAuth apps, run compliance checks, sync employees, manage variables, and collect automated evidence."
  },
  {
    "name": "get-available-sync-providers",
    "description": "List sync providers available to the org\n\nList sync providers available to the org in Comp AI. Connect vendor systems, configure OAuth apps, run compliance checks, sync employees, manage variables, and collect automated evidence."
  },
  {
    "name": "sync-dynamic-provider-employees",
    "description": "Sync employees for a dynamic provider\n\nSync employees for a dynamic provider in Comp AI. Connect vendor systems, configure OAuth apps, run compliance checks, sync employees, manage variables, and collect automated evidence."
  },
  {
    "name": "sync-dynamic-provider-devices",
    "description": "Sync devices for a dynamic provider\n\nSync devices for a dynamic provider in Comp AI. Connect vendor systems, configure OAuth apps, run compliance checks, sync employees, manage variables, and collect automated evidence."
  },
  {
    "name": "get-activity",
    "description": "List recent cloud security activity\n\nList recent cloud security activity in Comp AI. Run AWS, Azure, and GCP cloud security scans, detect enabled services, review findings, and connect cloud posture results to compliance work."
  },
  {
    "name": "get-providers",
    "description": "List supported cloud providers\n\nList supported cloud providers in Comp AI. Run AWS, Azure, and GCP cloud security scans, detect enabled services, review findings, and connect cloud posture results to compliance work."
  },
  {
    "name": "get-findings",
    "description": "List cloud security findings\n\nList cloud security findings discovered by scans so teams can prioritize remediation before issues become audit findings."
  },
  {
    "name": "mark-finding-as-exception",
    "description": "Mark a finding as an exception so it no longer appears in the active Scan Results list\n\nAccepts session, API key, or service token auth. For API key / service token callers without an explicit user attribution, the action is attributed to the org's owner and the audit log description records the calling key/service name."
  },
  {
    "name": "update-aws-scan-mode",
    "description": "Switch the AWS scan engine for a connection (Comp AI scanners ↔ Security Hub)\n\nAccepts session, API key, or service token auth. For API key / service token callers without an explicit user attribution, the action is attributed to the org's owner."
  },
  {
    "name": "revoke-exception",
    "description": "Revoke an exception, reopening the finding\n\nAccepts session, API key, or service token auth. For API key / service token callers without an explicit user attribution, the action is attributed to the org's owner."
  },
  {
    "name": "get-history",
    "description": "List resolution, exception, and regression history for a connection\n\nList resolution, exception, and regression history for a connection in Comp AI. Run AWS, Azure, and GCP cloud security scans, detect enabled services, review findings, and connect cloud posture results to compliance work."
  },
  {
    "name": "get-check-definition",
    "description": "Resolve the \"About this check\" description for a finding (AI-cached for AWS; provider-derived for GCP/Azure)\n\nResolve the \"About this check\" description for a finding (AI-cached for AWS; provider-derived for GCP/Azure) in Comp AI. Run AWS, Azure, and GCP cloud security scans, detect enabled services, review findings, and connect cloud posture."
  },
  {
    "name": "scan",
    "description": "Run cloud security scan\n\nTrigger a cloud security scan for a connected AWS, Azure, or GCP account and collect findings for compliance remediation."
  },
  {
    "name": "detect-services",
    "description": "Detect available cloud services for a connection\n\nDetect available cloud services for a connection in Comp AI. Run AWS, Azure, and GCP cloud security scans, detect enabled services, review findings, and connect cloud posture results to compliance work."
  },
  {
    "name": "detect-gcp-org",
    "description": "Detect the GCP organization for a connection\n\nDetect the GCP organization for a connection in Comp AI. Run AWS, Azure, and GCP cloud security scans, detect enabled services, review findings, and connect cloud posture results to compliance work."
  },
  {
    "name": "select-gcp-projects",
    "description": "Select GCP projects for a connection\n\nSelect GCP projects for a connection in Comp AI. Run AWS, Azure, and GCP cloud security scans, detect enabled services, review findings, and connect cloud posture results to compliance work."
  },
  {
    "name": "setup-gcp",
    "description": "Set up GCP for a connection\n\nSet up GCP for a connection in Comp AI. Run AWS, Azure, and GCP cloud security scans, detect enabled services, review findings, and connect cloud posture results to compliance work."
  },
  {
    "name": "resolve-gcp-setup-step",
    "description": "Resolve a GCP setup step\n\nResolve a GCP setup step in Comp AI. Run AWS, Azure, and GCP cloud security scans, detect enabled services, review findings, and connect cloud posture results to compliance work."
  },
  {
    "name": "setup-azure",
    "description": "Set up Azure for a connection\n\nSet up Azure for a connection in Comp AI. Run AWS, Azure, and GCP cloud security scans, detect enabled services, review findings, and connect cloud posture results to compliance work."
  },
  {
    "name": "validate-azure",
    "description": "Validate Azure credentials for a connection\n\nValidate Azure credentials for a connection in Comp AI. Run AWS, Azure, and GCP cloud security scans, detect enabled services, review findings, and connect cloud posture results to compliance work."
  },
  {
    "name": "trigger-scan",
    "description": "Trigger a cloud security run for a connection\n\nTrigger a cloud security run for a connection in Comp AI. Run AWS, Azure, and GCP cloud security scans, detect enabled services, review findings, and connect cloud posture results to compliance work."
  },
  {
    "name": "get-run-status",
    "description": "Get a cloud security scan run by ID\n\nGet a cloud security scan run by ID in Comp AI. Run AWS, Azure, and GCP cloud security scans, detect enabled services, review findings, and connect cloud posture results to compliance work."
  },
  {
    "name": "get-task-items-stats",
    "description": "Get task items statistics for an entity\n\nGet task items statistics for an entity in Comp AI. Manage task items and attachments linked to operational entities such as risks and vendors."
  },
  {
    "name": "get-task-items",
    "description": "Get task items for an entity\n\nGet task items for an entity in Comp AI. Manage task items and attachments linked to operational entities such as risks and vendors."
  },
  {
    "name": "create-task-item",
    "description": "Create a new task item\n\nCreate a new task item in Comp AI. Manage task items and attachments linked to operational entities such as risks and vendors."
  },
  {
    "name": "update-task-item",
    "description": "Update a task item\n\nUpdate a task item in Comp AI. Manage task items and attachments linked to operational entities such as risks and vendors."
  },
  {
    "name": "delete-task-item",
    "description": "Delete a task item\n\nDelete a task item in Comp AI. Manage task items and attachments linked to operational entities such as risks and vendors."
  },
  {
    "name": "upload-task-item-attachment",
    "description": "Upload attachment to task item\n\nUpload a file attachment for a task item with proper S3 path structure: org_{orgId}/attachments/task-item/{entityType}/{entityId}/files."
  },
  {
    "name": "delete-task-item-attachment",
    "description": "Delete attachment from task item\n\nDelete attachment from task item in Comp AI. Manage task items and attachments linked to operational entities such as risks and vendors."
  },
  {
    "name": "get-task-item-activity",
    "description": "Get task item activity log\n\nGet task item activity log in Comp AI. Manage task items and attachments linked to operational entities such as risks and vendors."
  },
  {
    "name": "get-completions",
    "description": "List training completions\n\nList security awareness and HIPAA training completion records for workforce compliance tracking and audit evidence."
  },
  {
    "name": "mark-video-complete",
    "description": "Mark a training video as complete\n\nMarks a specific training video as completed for the authenticated member. Triggers completion email if all training is now done."
  },
  {
    "name": "send-training-completion-email",
    "description": "Send training completion email with certificate\n\nSend training completion email with certificate in Comp AI. Record security awareness and HIPAA training completion status and generate completion certificates."
  },
  {
    "name": "generate-certificate",
    "description": "Generate training certificate\n\nGenerate a training completion certificate that can be shared with auditors or attached as workforce security evidence."
  },
  {
    "name": "generate-hipaa-certificate",
    "description": "Generate HIPAA training certificate PDF\n\nGenerate HIPAA training certificate PDF in Comp AI. Record security awareness and HIPAA training completion status and generate completion certificates."
  },
  {
    "name": "get-org-chart",
    "description": "Get the organization chart\n\nGet the organization chart in Comp AI. Manage organization chart metadata and evidence used for governance, accountability, and audit readiness."
  },
  {
    "name": "upsert-org-chart",
    "description": "Create or update an interactive organization chart\n\nCreate or update an interactive organization chart in Comp AI. Manage organization chart metadata and evidence used for governance, accountability, and audit readiness."
  },
  {
    "name": "delete-org-chart",
    "description": "Delete the organization chart\n\nDelete the organization chart in Comp AI. Manage organization chart metadata and evidence used for governance, accountability, and audit readiness."
  },
  {
    "name": "upload-org-chart",
    "description": "Upload an image as the organization chart\n\nUpload an image as the organization chart in Comp AI. Manage organization chart metadata and evidence used for governance, accountability, and audit readiness."
  },
  {
    "name": "list-forms",
    "description": "List evidence forms\n\nList structured evidence forms that collect recurring submissions for security, HR, IT, finance, and compliance workflows."
  },
  {
    "name": "get-form-statuses",
    "description": "Get submission statuses for all forms\n\nGet submission statuses for all forms in Comp AI. Collect, review, upload, and export structured evidence submissions for compliance tasks and document requirements."
  },
  {
    "name": "get-form-settings",
    "description": "Get document relevance settings\n\nGet document relevance settings in Comp AI. Collect, review, upload, and export structured evidence submissions for compliance tasks and document requirements."
  },
  {
    "name": "update-form-setting",
    "description": "Update document relevance setting\n\nUpdate document relevance setting in Comp AI. Collect, review, upload, and export structured evidence submissions for compliance tasks and document requirements."
  },
  {
    "name": "get-my-submissions",
    "description": "Get current user submissions\n\nGet current user submissions in Comp AI. Collect, review, upload, and export structured evidence submissions for compliance tasks and document requirements."
  },
  {
    "name": "get-pending-submission-count",
    "description": "Get pending submission count for current user\n\nGet pending submission count for current user in Comp AI. Collect, review, upload, and export structured evidence submissions for compliance tasks and document requirements."
  },
  {
    "name": "get-form-with-submissions",
    "description": "Get form definition and submissions\n\nGet form definition and submissions in Comp AI. Collect, review, upload, and export structured evidence submissions for compliance tasks and document requirements."
  },
  {
    "name": "get-submission",
    "description": "Get a single submission\n\nGet a single submission in Comp AI. Collect, review, upload, and export structured evidence submissions for compliance tasks and document requirements."
  },
  {
    "name": "delete-submission",
    "description": "Delete a submission\n\nDelete a submission in Comp AI. Collect, review, upload, and export structured evidence submissions for compliance tasks and document requirements."
  },
  {
    "name": "submit-form",
    "description": "Submit evidence form\n\nSubmit structured evidence responses and attachments for review against a compliance task or document requirement."
  },
  {
    "name": "upload-submission",
    "description": "Upload a file as an evidence submission\n\nUpload a PDF or image file and create a submission for the given form type, bypassing form-specific validation. Accepts session, API key, or service token auth. For API key / service token callers without an explicit user attribution, the."
  },
  {
    "name": "review-submission",
    "description": "Review evidence submission\n\nApprove or reject a submitted evidence form so task status and audit readiness reflect the latest review decision."
  },
  {
    "name": "upload-file",
    "description": "Upload evidence form file\n\nUpload evidence form file in Comp AI. Collect, review, upload, and export structured evidence submissions for compliance tasks and document requirements."
  },
  {
    "name": "export-csv",
    "description": "Export evidence submissions\n\nExport evidence form submissions as CSV for auditor requests, offline review, or internal compliance reporting."
  },
  {
    "name": "get-audit-logs",
    "description": "List audit logs\n\nList organization audit logs for compliance activity, access changes, evidence updates, and customer-facing review events."
  },
  {
    "name": "list",
    "description": "List penetration test runs\n\nList penetration test runs in Comp AI. Create AI-powered penetration test runs, track progress, inspect findings and events, and download markdown or PDF reports."
  },
  {
    "name": "security-penetration-tests-create",
    "description": "Create penetration test\n\nCreate an AI-powered penetration test run for an approved target and track the resulting findings and report artifacts."
  },
  {
    "name": "get-by-id",
    "description": "Get penetration test status\n\nGet penetration test status in Comp AI. Create AI-powered penetration test runs, track progress, inspect findings and events, and download markdown or PDF reports."
  },
  {
    "name": "get-progress",
    "description": "Get penetration test progress\n\nGet penetration test progress in Comp AI. Create AI-powered penetration test runs, track progress, inspect findings and events, and download markdown or PDF reports."
  },
  {
    "name": "get-issues",
    "description": "Get penetration test issues\n\nReturns the structured findings discovered during the run. Grows over time during a live scan as agents discover more issues."
  },
  {
    "name": "get-events",
    "description": "Get penetration test agent events\n\nReturns the real-time agent activity log emitted during a run (tool calls, observations, etc.). Noisy — meant for activity feeds and debugging."
  },
  {
    "name": "get-report",
    "description": "Get penetration test output\n\nGet penetration test output in Comp AI. Create AI-powered penetration test runs, track progress, inspect findings and events, and download markdown or PDF reports."
  },
  {
    "name": "get-pdf",
    "description": "Get penetration test PDF\n\nGet penetration test PDF in Comp AI. Create AI-powered penetration test runs, track progress, inspect findings and events, and download markdown or PDF reports."
  },
  {
    "name": "get-pending-offboardings",
    "description": "Get members with pending offboarding checklists\n\nLists members whose offboarding checklist is still incomplete, with their outstanding items, so you can track and finish departing-employee offboarding."
  },
  {
    "name": "get-template",
    "description": "Get the offboarding checklist template\n\nReturns the organization's offboarding checklist template: the ordered set of items every departing member must complete during their offboarding."
  },
  {
    "name": "create-template-item",
    "description": "Add an offboarding checklist template item\n\nCreates a new item in the organization's offboarding checklist template so it appears on every member's offboarding checklist from now on."
  },
  {
    "name": "update-template-item",
    "description": "Update an offboarding checklist template item\n\nUpdates an existing offboarding checklist template item by id, changing its label, description, or settings on the organization's offboarding template."
  },
  {
    "name": "delete-template-item",
    "description": "Delete an offboarding checklist template item\n\nRemoves an item from the organization's offboarding checklist template by id so it no longer appears on members' offboarding checklists."
  },
  {
    "name": "get-member-checklist",
    "description": "Get a member's offboarding checklist\n\nReturns the offboarding checklist for a specific member, including each item and whether it has been completed, to track that person's offboarding progress."
  },
  {
    "name": "offboarding-checklist-export-all-evidence",
    "description": "Export all offboarding evidence as a zip file\n\nExports a zip archive containing the offboarding checklist evidence for every member in the organization, for audits, handovers, or record-keeping."
  },
  {
    "name": "export-evidence",
    "description": "Export offboarding evidence as a zip file\n\nExports a zip archive of the offboarding checklist evidence collected for a single member, for audit, handover, or record-keeping purposes."
  },
  {
    "name": "complete-item",
    "description": "Complete an offboarding checklist item\n\nMarks a specific offboarding checklist item complete for a member, recording who completed it and when, as part of finishing that member's offboarding."
  },
  {
    "name": "uncomplete-item",
    "description": "Reopen an offboarding checklist item\n\nReverts a previously completed offboarding checklist item back to incomplete for a member, in case the step was marked done by mistake."
  },
  {
    "name": "upload-evidence",
    "description": "Upload evidence for an offboarding checklist item\n\nAttaches a supporting evidence file to a member's completed offboarding checklist item, documenting that the offboarding step was actually carried out."
  },
  {
    "name": "get-access-revocations",
    "description": "Get vendor access revocation status for a member\n\nLists the vendors a departing member had access to and whether each has been revoked, so you can confirm all vendor access is removed during offboarding."
  },
  {
    "name": "revoke-all-vendor-access",
    "description": "Confirm all vendor access as revoked\n\nMarks every vendor access record for a departing member as revoked in one step, recording who confirmed it, to complete access removal during offboarding."
  },
  {
    "name": "revoke-vendor-access",
    "description": "Mark vendor access as revoked\n\nMarks a single vendor's access for a departing member as revoked, optionally attaching evidence and notes, as part of offboarding access removal."
  },
  {
    "name": "undo-vendor-revocation",
    "description": "Undo vendor access revocation\n\nReverses a vendor access revocation for a member, marking that vendor's access as not revoked again, in case it was confirmed by mistake during offboarding."
  }
];
