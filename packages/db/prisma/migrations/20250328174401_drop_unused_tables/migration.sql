/*
  Warnings:

  - You are about to drop the `Artifact` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Control` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ControlArtifact` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ControlRequirement` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EmployeePolicyAcceptance` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EmployeeRequiredTask` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EmployeeTask` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Evidence` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Framework` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `OrganizationIntegrationResultsComments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Policy` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PolicyComments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PolicyControl` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PolicyFramework` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PortalAccount` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PortalTrainingVideos` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PortalUser` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TaskComments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `VendorComment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `VendorTaskComment` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Artifact" DROP CONSTRAINT "Artifact_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "Artifact" DROP CONSTRAINT "Artifact_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "Control" DROP CONSTRAINT "Control_frameworkCategoryId_fkey";

-- DropForeignKey
ALTER TABLE "ControlArtifact" DROP CONSTRAINT "ControlArtifact_artifactId_fkey";

-- DropForeignKey
ALTER TABLE "ControlArtifact" DROP CONSTRAINT "ControlArtifact_organizationControlId_fkey";

-- DropForeignKey
ALTER TABLE "ControlRequirement" DROP CONSTRAINT "ControlRequirement_controlId_fkey";

-- DropForeignKey
ALTER TABLE "ControlRequirement" DROP CONSTRAINT "ControlRequirement_evidenceId_fkey";

-- DropForeignKey
ALTER TABLE "ControlRequirement" DROP CONSTRAINT "ControlRequirement_policyId_fkey";

-- DropForeignKey
ALTER TABLE "Employee" DROP CONSTRAINT "Employee_linkId_fkey";

-- DropForeignKey
ALTER TABLE "EmployeePolicyAcceptance" DROP CONSTRAINT "EmployeePolicyAcceptance_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "EmployeePolicyAcceptance" DROP CONSTRAINT "EmployeePolicyAcceptance_policyId_fkey";

-- DropForeignKey
ALTER TABLE "EmployeeTask" DROP CONSTRAINT "EmployeeTask_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "EmployeeTask" DROP CONSTRAINT "EmployeeTask_requiredTaskId_fkey";

-- DropForeignKey
ALTER TABLE "FrameworkCategory" DROP CONSTRAINT "FrameworkCategory_frameworkId_fkey";

-- DropForeignKey
ALTER TABLE "Organization" DROP CONSTRAINT "Organization_frameworkId_fkey";

-- DropForeignKey
ALTER TABLE "OrganizationCategory" DROP CONSTRAINT "OrganizationCategory_frameworkId_fkey";

-- DropForeignKey
ALTER TABLE "OrganizationControl" DROP CONSTRAINT "OrganizationControl_controlId_fkey";

-- DropForeignKey
ALTER TABLE "OrganizationControlRequirement" DROP CONSTRAINT "OrganizationControlRequirement_controlRequirementId_fkey";

-- DropForeignKey
ALTER TABLE "OrganizationEvidence" DROP CONSTRAINT "OrganizationEvidence_evidenceId_fkey";

-- DropForeignKey
ALTER TABLE "OrganizationEvidence" DROP CONSTRAINT "OrganizationEvidence_frameworkId_fkey";

-- DropForeignKey
ALTER TABLE "OrganizationFramework" DROP CONSTRAINT "OrganizationFramework_frameworkId_fkey";

-- DropForeignKey
ALTER TABLE "OrganizationIntegrationResultsComments" DROP CONSTRAINT "OrganizationIntegrationResultsComments_OrganizationIntegra_fkey";

-- DropForeignKey
ALTER TABLE "OrganizationIntegrationResultsComments" DROP CONSTRAINT "OrganizationIntegrationResultsComments_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "OrganizationIntegrationResultsComments" DROP CONSTRAINT "OrganizationIntegrationResultsComments_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "OrganizationPolicy" DROP CONSTRAINT "OrganizationPolicy_policyId_fkey";

-- DropForeignKey
ALTER TABLE "OrganizationTrainingVideos" DROP CONSTRAINT "OrganizationTrainingVideos_trainingVideoId_fkey";

-- DropForeignKey
ALTER TABLE "PolicyComments" DROP CONSTRAINT "PolicyComments_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "PolicyComments" DROP CONSTRAINT "PolicyComments_organizationPolicyId_fkey";

-- DropForeignKey
ALTER TABLE "PolicyComments" DROP CONSTRAINT "PolicyComments_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "PolicyControl" DROP CONSTRAINT "PolicyControl_controlId_fkey";

-- DropForeignKey
ALTER TABLE "PolicyControl" DROP CONSTRAINT "PolicyControl_policyId_fkey";

-- DropForeignKey
ALTER TABLE "PolicyFile" DROP CONSTRAINT "PolicyFile_policyId_fkey";

-- DropForeignKey
ALTER TABLE "PolicyFramework" DROP CONSTRAINT "PolicyFramework_frameworkId_fkey";

-- DropForeignKey
ALTER TABLE "PolicyFramework" DROP CONSTRAINT "PolicyFramework_policyId_fkey";

-- DropForeignKey
ALTER TABLE "PortalAccount" DROP CONSTRAINT "PortalAccount_userId_fkey";

-- DropForeignKey
ALTER TABLE "PortalSession" DROP CONSTRAINT "PortalSession_userId_fkey";

-- DropForeignKey
ALTER TABLE "PortalUser" DROP CONSTRAINT "PortalUser_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "TaskComments" DROP CONSTRAINT "TaskComments_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "TaskComments" DROP CONSTRAINT "TaskComments_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "TaskComments" DROP CONSTRAINT "TaskComments_riskId_fkey";

-- DropForeignKey
ALTER TABLE "TaskComments" DROP CONSTRAINT "TaskComments_riskMitigationTaskId_fkey";

-- DropForeignKey
ALTER TABLE "VendorComment" DROP CONSTRAINT "VendorComment_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "VendorComment" DROP CONSTRAINT "VendorComment_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "VendorComment" DROP CONSTRAINT "VendorComment_vendorId_fkey";

-- DropForeignKey
ALTER TABLE "VendorTaskComment" DROP CONSTRAINT "VendorTaskComment_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "VendorTaskComment" DROP CONSTRAINT "VendorTaskComment_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "VendorTaskComment" DROP CONSTRAINT "VendorTaskComment_taskId_fkey";

-- DropForeignKey
ALTER TABLE "VendorTaskComment" DROP CONSTRAINT "VendorTaskComment_vendorId_fkey";

-- DropTable
DROP TABLE "Artifact";

-- DropTable
DROP TABLE "Control";

-- DropTable
DROP TABLE "ControlArtifact";

-- DropTable
DROP TABLE "ControlRequirement";

-- DropTable
DROP TABLE "EmployeePolicyAcceptance";

-- DropTable
DROP TABLE "EmployeeRequiredTask";

-- DropTable
DROP TABLE "EmployeeTask";

-- DropTable
DROP TABLE "Evidence";

-- DropTable
DROP TABLE "Framework";

-- DropTable
DROP TABLE "OrganizationIntegrationResultsComments";

-- DropTable
DROP TABLE "Policy";

-- DropTable
DROP TABLE "PolicyComments";

-- DropTable
DROP TABLE "PolicyControl";

-- DropTable
DROP TABLE "PolicyFramework";

-- DropTable
DROP TABLE "PortalAccount";

-- DropTable
DROP TABLE "PortalTrainingVideos";

-- DropTable
DROP TABLE "PortalUser";

-- DropTable
DROP TABLE "TaskComments";

-- DropTable
DROP TABLE "VendorComment";

-- DropTable
DROP TABLE "VendorTaskComment";
