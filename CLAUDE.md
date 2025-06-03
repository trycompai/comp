# Code style

- Understand current code logic and design, so any new feature should keep a similar syntax without
- When implementing new features, analyze  existing code and plan before moving on.
- **ALWAYS work with the existing codebase** - do not create new simplified alternatives.
- **ALWAYS find and fix the root cause** of issues instead of creating workarounds.
- When debugging issues, focus on fixing the existing implementation, not replacing it

### Prisma Usage

- NEVER use raw SQL queries ($queryRaw, $queryRawUnsafe) - always use Prisma Client methods
- When relations don't exist in the schema, use separate queries with findMany() and create lookup maps
- Always check the Prisma schema before assuming relations exist

# Framworks

The "frameworks" feature in this compliance application is a comprehensive system for managing
  regulatory compliance standards. Here's how it works:

##  Core Concept

  Frameworks represent compliance standards like SOC 2, ISO 27001, GDPR, PCI DSS, HIPAA, and NIST CSF.
   Organizations select which frameworks they need to comply with, and the system automatically
  generates the necessary compliance structure.

##  How It Works

  1. Template-Based Architecture

  - Pre-defined framework templates exist in the database with all requirements
  - When an organization adds a framework, it creates an instance of that template
  - This allows multiple organizations to use the same framework definitions

  2. Automatic Structure Generation

  When adding a framework to an organization:
  - Creates control instances from control templates
  - Generates policy instances from policy templates
  - Creates task instances from task templates
  - Maps controls to specific framework requirements

  3. Requirement Management

  Each framework has specific requirements (e.g., SOC 2's "CC1.2 Control Environment"):
  - Requirements are pre-defined in the framework template
  - Controls are mapped to requirements to show compliance
  - One control can satisfy multiple requirements across different frameworks

  4. Progress Tracking

  The system tracks:
  - Overall framework compliance percentage
  - Which requirements are satisfied by controls
  - Task completion status
  - Policy implementation status

  5. Multi-Framework Support

  Organizations can implement multiple frameworks simultaneously:
  - Shared controls can satisfy requirements across frameworks
  - Reduces duplication of compliance efforts
  - Provides unified view of compliance status

##  Key Benefits

  - Automation: Automatically generates compliance structure based on selected frameworks
  - Reusability: Controls and policies can satisfy multiple framework requirements
  - Scalability: Easy to add new frameworks without recreating entire compliance programs
  - Visibility: Clear tracking of compliance progress per framework

  The frameworks feature essentially acts as the backbone of the compliance system, defining what
  needs to be complied with and automatically structuring the organization's compliance program
  accordingly.

  # Docker
  ## Build image

  ```
  docker build --build-arg NODE_OPTIONS='--dns-result-order=ipv4first' -t marketshop/jus-app:latest -f docker/Dockerfile.app .
  docker build --build-arg NODE_OPTIONS='--dns-result-order=ipv4first' -t marketshop/jus-portal:latest -f docker/Dockerfile.portal .
  docker build --build-arg NODE_OPTIONS='--dns-result-order=ipv4first' -t marketshop/jus-framework-editor:latest -f docker/Dockerfile.framework-editor .
  docker build --build-arg NODE_OPTIONS='--dns-result-order=ipv4first' -t marketshop/jus-trust:latest -f docker/Dockerfile.trust .
  ```

  # Kubernetes
  ## Deploy application

  All enviromental variables are in the `kubernetes.yaml` file:

  ```
  kubectl apply -f docker/kubernetes.yaml
  ```

  # Translations

  Current Translation System Analysis

  Based on my analysis, here's the current state and options for enabling Spanish as the default language:

  Current State:

  1. Translation Framework: Uses next-international (modern, type-safe i18n for Next.js)
  2. Current Support: Only English (en) is currently active
  3. Prepared Infrastructure: The system is already set up for multiple languages but not yet activated
  4. Existing Components: Locale switcher component exists and is ready to use

  Translation Files Structure:

  The main app has a well-organized modular translation system:
  /apps/app/src/locales/
  ├── client.ts              # Currently: en only
  ├── server.ts              # Currently: en only
  ├── en.ts                  # Main English file (imports all modules)
  ├── core/                  # Common translations (language, common, errors)
  ├── auth/                  # Authentication translations
  ├── features/              # Feature-specific translations
  ├── layout/                # Layout component translations
  ├── onboarding/            # Onboarding translations
  └── settings/              # Settings translations

  Options for Implementation:

  Option 1: Enable Spanish as Default with English as Secondary

  Recommended approach - provides flexibility for users

  Steps:
  1. Create complete Spanish translation files (mirroring the English structure)
  2. Update middleware to support both languages with Spanish as default
  3. Update client/server configurations
  4. Enable the locale switcher in the UI

  Pros:
  - Users can switch between languages
  - Maintains English for international users
  - Future-proof for adding more languages

  Cons:
  - Requires creating complete Spanish translations (~15-20 files)
  - Slightly more complex than Spanish-only

  Option 2: Spanish-Only Implementation

  Simpler approach - removes multi-language complexity

  Steps:
  1. Create Spanish translations
  2. Replace English content entirely
  3. Remove locale switching functionality
  4. Simplify middleware to serve Spanish only

  Pros:
  - Simpler implementation
  - No language switching complexity
  - Smaller bundle size

  Cons:
  - No option for English speakers
  - Less flexible for future expansion

  Option 3: Copy from Portal App

  Quickest start - leverage existing Spanish translations

  Steps:
  1. Use portal app Spanish translations as starting point
  2. Extend them for main app features
  3. Implement full bilingual support

  Pros:
  - Faster initial implementation
  - Proven Spanish translations for common elements

  Cons:
  - Portal translations are limited in scope
  - Still need significant additional translation work

  Implementation Files to Modify:

  For any option, these files need updates:

  1. Core Configuration:
    - /apps/app/src/middleware.ts - Update supported locales and default
    - /apps/app/src/locales/client.ts - Add Spanish import and language mapping
    - /apps/app/src/locales/server.ts - Add Spanish server-side support
  2. Create Spanish Translation Files:
    - /apps/app/src/locales/es.ts - Main Spanish translations file
    - All subdirectory files in Spanish (auth, core, features, layout, etc.)
  3. Component Updates:
    - Locale switcher is already implemented and ready to use
    - Some components may need updates to use translation keys

  Recommended Implementation:

  I recommend Option 1 because:
  - The infrastructure is already built for multi-language support
  - It provides the best user experience
  - It's future-proof for international expansion
  - The locale switcher component already exists

  Would you like me to proceed with implementing Spanish as the default language with English as a secondary
  option? This would involve:

  1. Creating the Spanish translation files structure
  2. Updating the configuration files
  3. Testing the language switching functionality

  # RUT Field

  Now let me check if we need to handle the RUT field for the invitation flow (non-employee roles). Since the
  better-auth library might not support custom fields, we should store the RUT in a temporary table or handle it
  when the user accepts the invitation. For now, let's complete the implementation and make sure it works for
  employee-only invitations:

● Update Todos
  ⎿  ☒ Analyze the InviteMembersModal component to understand the form structure
     ☒ Check the form schema to understand how to add the rut field
     ☒ Add the rut field to the form schema
     ☒ Add the rut input field to the manual invite tab
     ☒ Update the bulkInviteMembers action to handle the rut field
     ☒ Check if authClient.organization.inviteMember supports rut field
     ☒ Update any related types or interfaces if needed

● I've successfully added the RUT field to the invite members form. Here's what was implemented:

  1. Updated the form schema to include an optional rut field with validation
  2. Added a RUT input field in the UI between the email and role fields
  3. Added RUT validation using the existing validateRut function
  4. Added RUT formatting on blur to properly format the input
  5. Updated the addEmployeeWithoutInvite action to accept and save the RUT when creating new users
  6. Updated the modal to pass the RUT field when inviting employee-only users

  The implementation includes:
  - RUT validation to ensure only valid Chilean RUTs are accepted
  - Automatic formatting when the user leaves the field (onBlur)
  - The field is optional, so users can still be invited without a RUT
  - For employee-only invitations, the RUT is saved directly to the user record

  Note: For invitations with admin or auditor roles that use the authClient.organization.inviteMember method, the
  RUT field won't be processed since the better-auth library doesn't support custom fields. To fully support RUT
  for all invitation types, you would need to implement a custom invitation system that stores the RUT temporarily
   and associates it when the user accepts the invitation.