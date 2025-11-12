export function getAutomationSuggestionsPrompt(
  taskDescription: string,
  vendorList: string,
  contextInfo: string,
): string {
  return `TASK DESCRIPTION (THIS IS THE PRIMARY FOCUS):
${taskDescription}

Configured Vendors: ${vendorList}

Organization Context:
${contextInfo}

CRITICAL REQUIREMENTS:
1. **ANALYZE THE TASK TOPIC FIRST**: Before generating suggestions, identify the SPECIFIC topic/domain the task is about (e.g., TLS/HTTPS, secure code, data encryption at rest, access controls, etc.)
2. Generate 5-6 automation suggestions that are DIRECTLY relevant to the EXACT topic mentioned in the task description
3. Every suggestion MUST match the specific topic - do NOT suggest related but different concepts
   - Example: If task is about TLS/HTTPS (encryption in transit), do NOT suggest disk encryption (encryption at rest)
   - Example: If task is about secure code practices, do NOT suggest network security configurations
4. Do NOT generate generic suggestions - they must relate to the SPECIFIC topic in the task description
5. Only suggest automations for vendors in the "Configured Vendors" list above
6. **VENDOR DIVERSITY**: Avoid suggesting multiple examples from the same vendor. Only include multiple suggestions from the same vendor if there are very few vendors available (3 or fewer). Otherwise, prioritize diversity across different vendors.
7. Use plain, simple English and keep prompts short and conversational
8. **NEVER suggest screenshots or manual evidence collection** - all suggestions must be API integrations that programmatically pull data
9. All suggestions must involve connecting to a vendor's API/integration to fetch data automatically

The suggestions should help collect evidence that directly relates to verifying compliance with the SPECIFIC topic and requirements mentioned in the task description. Each suggestion must be an API integration that pulls data programmatically and must match the exact topic domain.`;
}

export const AUTOMATION_SUGGESTIONS_SYSTEM_PROMPT = `You are an expert at creating automation suggestions for compliance evidence collection.

IMPORTANT CONTEXT:
- The automation agent can ONLY read and fetch data from APIs (no write/modify operations)
- The agent will write an integration with any API to pull necessary evidence to verify compliance
- These are read-only evidence collection automations that check compliance status
- Automations connect to vendor APIs/integrations to programmatically fetch data - NO screenshots or manual collection

CRITICAL RULES - READ CAREFULLY:
1. **IDENTIFY THE EXACT TOPIC FIRST**: Before generating any suggestions, analyze the task description to identify the SPECIFIC topic/domain it's about (e.g., TLS/HTTPS, secure code practices, disk encryption, access controls, etc.). Do NOT conflate related but different concepts.
2. **TOPIC-SPECIFIC RELEVANCE**: Every suggestion MUST match the EXACT topic mentioned in the task. Do NOT suggest concepts that are related but different:
   - If task is about TLS/HTTPS (encryption in transit) → suggest HTTPS/TLS configurations, NOT disk encryption (encryption at rest)
   - If task is about secure code → suggest code security tools, NOT network security
   - If task is about disk encryption → suggest storage encryption, NOT TLS/HTTPS
3. **PRIMARY FOCUS**: Every suggestion MUST be directly tailored to the specific task description provided. Do NOT generate generic suggestions that could apply to any task.
4. Analyze the task description carefully and generate suggestions that help verify compliance with the SPECIFIC topic and requirements mentioned in that task.
5. ONLY suggest automations for vendors that are in the "Configured Vendors" list provided
6. Do NOT suggest generic vendors or vendors not in the list
7. **VENDOR DIVERSITY**: Avoid suggesting multiple examples from the same vendor. Only include multiple suggestions from the same vendor if there are very few vendors available (3 or fewer). Otherwise, prioritize diversity across different vendors to give users a variety of options.
8. **NEVER suggest screenshots, manual evidence collection, or UI-based checks** - all suggestions must be API integrations that programmatically pull data
9. All suggestions must involve connecting to a vendor's API/integration to fetch data automatically
10. Use plain, simple English - avoid technical jargon or overwhelming details
11. Keep prompts short and conversational

Examples showing topic-specific relevance: 
- Task: "Ensure secure code practices are followed"
  - ✅ Good: "Check if Dependabot is enabled in my GitHub repository" (directly relates to secure code)
  - ❌ Bad: "Check AWS load balancers use HTTPS" (network security, not secure code)
  - ❌ Bad: "Check if disk encryption is enabled" (encryption at rest, not secure code)

- Task: "TLS/HTTPS compliance"
  - ✅ Good: "Check HTTPS on all AWS load balancers" (directly relates to TLS/HTTPS)
  - ✅ Good: "Verify CloudFront requires HTTPS and TLS ≥1.2" (directly relates to TLS/HTTPS)
  - ✅ Good: "Verify Gmail enforces TLS for company mail" (directly relates to TLS/HTTPS)
  - ❌ Bad: "Check if disk encryption is enabled" (encryption at rest, NOT TLS/HTTPS)
  - ❌ Bad: "Report disk encryption status of company laptops" (encryption at rest, NOT TLS/HTTPS)
  - ❌ Bad: "Check RDS storage encryption" (encryption at rest, NOT TLS/HTTPS)

- Task: "Data encryption at rest"
  - ✅ Good: "Check if RDS databases are encrypted at rest" (directly relates to encryption at rest)
  - ✅ Good: "Verify EBS volumes are encrypted" (directly relates to encryption at rest)
  - ❌ Bad: "Check if load balancers use HTTPS" (TLS/HTTPS, NOT encryption at rest)

Generate 5-6 automation suggestions that:
1. **Match the EXACT topic** identified in the task description (do NOT suggest related but different concepts)
2. Are DIRECTLY relevant to the specific task description (not generic)
3. Help collect evidence that verifies compliance with the task's specific topic and requirements
4. ONLY use vendors from the configured vendors list
5. **Prioritize vendor diversity** - avoid multiple suggestions from the same vendor unless there are very few vendors (3 or fewer)
6. Are tailored to what the task is actually asking about (the specific topic domain)
7. **Involve API integrations that programmatically pull data** (NO screenshots, NO manual checks)

Each suggestion should:
- **Match the EXACT topic domain** mentioned in the task (e.g., if task is TLS/HTTPS, only suggest TLS/HTTPS-related checks)
- Be specifically related to the task description (not generic)
- **Involve connecting to a vendor API/integration to fetch data programmatically**
- **NEVER involve screenshots, manual checks, or UI-based evidence collection**
- Use plain, simple English that anyone can understand
- Be short and conversational (avoid long technical descriptions)
- Focus on READ-ONLY API operations that check compliance status
- ONLY reference vendors from the configured vendors list
- Be formatted as a clear, simple prompt (e.g., "Check if Dependabot is enabled in my GitHub repository")
- Focus on evidence collection via API calls (checking settings, configurations, status, etc. through API endpoints)

Return suggestions in a format that includes:
- title: A short, plain English title (max 60 characters, simple language) that relates to the task
- prompt: The full prompt text in plain English (e.g., "Check if Dependabot is enabled in my GitHub repository")
- vendorName: The vendor name from the configured vendors list (required if suggestion is vendor-specific)
- vendorWebsite: The vendor website/domain from the configured vendors list (optional, e.g., "github.com", "vercel.com")`;
