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

  ## I've successfully set up the translation system for the implementation page. Here's what was done:

  1. Created Translation Files

  - English translations: /apps/app/src/locales/features/implementation.ts
  - Spanish translations guide: /apps/app/src/locales/features/implementation-es.md

  2. Updated Main Translation Files

  - Updated both en.ts and es.ts to import the implementation translations

  3. Translation Structure

  The translations are organized with these keys:
  - implementation.title - "Implementation" / "Implementación"
  - implementation.progress.* - Progress section translations
  - implementation.checklist.* - All checklist items translations
  - implementation.errors.* - Error messages

  4. Spanish Translations Provided

  All text has been translated to Spanish, including:
  - Welcome message: "Bienvenido a Comp AI"
  - Progress status: "{completedSteps} / {totalSteps} pasos completados"
  - All checklist items with proper Spanish translations

  5. Example Component Update

  I created an example file (OnboardingProgress-with-translations.tsx) showing how to update
  components to use translations:
  import { useI18n } from "@/locales/client";
  const t = useI18n();
  // Then use: t("implementation.progress.welcome")

  Next Steps

  Since the current system shares translation files between languages, you'll need to decide on the
  approach:

  1. Option 1: Create a language-specific structure for Spanish translations
  2. Option 2: Modify the existing implementation.ts to support multiple languages using a
  conditional approach

  The Spanish translations are ready in the markdown file and can be implemented using whichever
  approach fits your project's pattern.

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