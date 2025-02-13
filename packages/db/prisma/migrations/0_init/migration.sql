-- CreateEnum
CREATE TYPE "Tier" AS ENUM ('free', 'pro');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('member', 'admin');

-- CreateEnum
CREATE TYPE "Departments" AS ENUM ('none', 'admin', 'gov', 'hr', 'it', 'itsm', 'qms');

-- CreateEnum
CREATE TYPE "RequirementType" AS ENUM ('policy', 'file', 'link', 'procedure', 'evidence', 'training');

-- CreateEnum
CREATE TYPE "FrameworkStatus" AS ENUM ('not_started', 'in_progress', 'compliant', 'non_compliant');

-- CreateEnum
CREATE TYPE "ComplianceStatus" AS ENUM ('not_started', 'in_progress', 'compliant', 'non_compliant');

-- CreateEnum
CREATE TYPE "ArtifactType" AS ENUM ('policy', 'evidence', 'procedure', 'training');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "RiskCategory" AS ENUM ('customer', 'governance', 'operations', 'other', 'people', 'regulatory', 'reporting', 'resilience', 'technology', 'vendor_management');

-- CreateEnum
CREATE TYPE "TreatmentType" AS ENUM ('accept', 'avoid', 'mitigate', 'transfer');

-- CreateEnum
CREATE TYPE "RiskStatus" AS ENUM ('open', 'pending', 'closed', 'archived');

-- CreateEnum
CREATE TYPE "RiskTaskStatus" AS ENUM ('open', 'pending', 'closed');

-- CreateEnum
CREATE TYPE "RiskAttachmentType" AS ENUM ('file', 'url');

-- CreateEnum
CREATE TYPE "VendorCategory" AS ENUM ('cloud', 'infrastructure', 'software_as_a_service', 'finance', 'marketing', 'sales', 'hr', 'other');

-- CreateEnum
CREATE TYPE "VendorStatus" AS ENUM ('not_assessed', 'in_progress', 'assessed');

-- CreateEnum
CREATE TYPE "VendorInherentRisk" AS ENUM ('low', 'medium', 'high', 'unknown');

-- CreateEnum
CREATE TYPE "VendorResidualRisk" AS ENUM ('low', 'medium', 'high', 'unknown');

-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('owner', 'admin', 'member', 'viewer');

-- CreateEnum
CREATE TYPE "EmployeeTaskStatus" AS ENUM ('assigned', 'in_progress', 'completed', 'overdue');

-- CreateEnum
CREATE TYPE "PolicyStatus" AS ENUM ('draft', 'published', 'archived');

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "refresh_token_expires_in" INTEGER,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "full_name" TEXT,
    "email" TEXT,
    "role" "Role" NOT NULL DEFAULT 'member',
    "onboarded" BOOLEAN NOT NULL DEFAULT false,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "lastLogin" TIMESTAMP(3),
    "organizationId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "name" TEXT NOT NULL,
    "subdomain" TEXT NOT NULL,
    "website" TEXT NOT NULL,
    "tier" "Tier" NOT NULL DEFAULT 'free',
    "policiesCreated" BOOLEAN NOT NULL DEFAULT false,
    "frameworkId" TEXT,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationIntegrations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "integration_id" TEXT NOT NULL,
    "settings" JSONB NOT NULL,
    "user_settings" JSONB NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "OrganizationIntegrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Framework" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "version" TEXT NOT NULL,

    CONSTRAINT "Framework_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationFramework" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "frameworkId" TEXT NOT NULL,
    "status" "FrameworkStatus" NOT NULL DEFAULT 'not_started',
    "adoptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAssessed" TIMESTAMP(3),
    "nextAssessment" TIMESTAMP(3),

    CONSTRAINT "OrganizationFramework_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FrameworkCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "frameworkId" TEXT NOT NULL,

    CONSTRAINT "FrameworkCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Control" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "domain" TEXT,
    "frameworkCategoryId" TEXT,

    CONSTRAINT "Control_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationControl" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "controlId" TEXT NOT NULL,
    "status" "ComplianceStatus" NOT NULL DEFAULT 'not_started',
    "lastReviewDate" TIMESTAMP(3),
    "nextReviewDate" TIMESTAMP(3),
    "organizationFrameworkId" TEXT,

    CONSTRAINT "OrganizationControl_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Artifact" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "needsReview" BOOLEAN NOT NULL DEFAULT true,
    "department" "Departments" NOT NULL DEFAULT 'none',
    "type" "ArtifactType" NOT NULL,
    "content" JSONB,
    "fileUrl" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "lastUpdated" TIMESTAMP(3),
    "organizationId" TEXT NOT NULL,
    "ownerId" TEXT,

    CONSTRAINT "Artifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ControlArtifact" (
    "id" TEXT NOT NULL,
    "organizationControlId" TEXT NOT NULL,
    "artifactId" TEXT NOT NULL,

    CONSTRAINT "ControlArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Risk" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "RiskCategory" NOT NULL,
    "department" "Departments",
    "status" "RiskStatus" NOT NULL DEFAULT 'open',
    "probability" INTEGER NOT NULL DEFAULT 0,
    "impact" INTEGER NOT NULL DEFAULT 0,
    "residual_probability" INTEGER NOT NULL DEFAULT 0,
    "residual_impact" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "ownerId" TEXT,

    CONSTRAINT "Risk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskComment" (
    "id" TEXT NOT NULL,
    "riskId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RiskComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskMitigationTask" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "RiskTaskStatus" NOT NULL DEFAULT 'open',
    "dueDate" TIMESTAMP(3),
    "notifiedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "riskId" TEXT NOT NULL,
    "ownerId" TEXT,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "RiskMitigationTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskComments" (
    "id" TEXT NOT NULL,
    "riskId" TEXT NOT NULL,
    "riskMitigationTaskId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskComments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskAttachment" (
    "id" TEXT NOT NULL,
    "riskMitigationTaskId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileKey" TEXT,
    "type" "RiskAttachmentType" NOT NULL DEFAULT 'file',
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ownerId" TEXT,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "TaskAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskTreatmentStrategy" (
    "id" TEXT NOT NULL,
    "type" "TreatmentType" NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "riskId" TEXT NOT NULL,

    CONSTRAINT "RiskTreatmentStrategy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vendors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "VendorCategory" NOT NULL,
    "status" "VendorStatus" NOT NULL DEFAULT 'not_assessed',
    "inherent_risk" "VendorInherentRisk" NOT NULL DEFAULT 'unknown',
    "residual_risk" "VendorResidualRisk" NOT NULL DEFAULT 'unknown',
    "lastAssessed" TIMESTAMP(3),
    "nextAssessment" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownerId" TEXT,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "Vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorContact" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "VendorContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorComment" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorMitigationTask" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "RiskTaskStatus" NOT NULL DEFAULT 'open',
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownerId" TEXT,
    "vendorId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "VendorMitigationTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorTaskComments" (
    "id" TEXT NOT NULL,
    "vendorMitigationTaskId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorTaskComments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorTaskAttachment" (
    "id" TEXT NOT NULL,
    "vendorMitigationTaskId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileKey" TEXT,
    "type" "RiskAttachmentType" NOT NULL DEFAULT 'file',
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ownerId" TEXT,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "VendorTaskAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorRiskAssessment" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "ownerId" TEXT,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "VendorRiskAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskAttachment" (
    "id" TEXT NOT NULL,
    "riskId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileKey" TEXT,
    "type" "RiskAttachmentType" NOT NULL DEFAULT 'file',
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ownerId" TEXT,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "RiskAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationMember" (
    "id" TEXT NOT NULL,
    "role" "MembershipRole" NOT NULL DEFAULT 'member',
    "invitedEmail" TEXT,
    "accepted" BOOLEAN NOT NULL DEFAULT false,
    "department" "Departments" NOT NULL DEFAULT 'none',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActive" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskTaskAssignment" (
    "id" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "taskId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,

    CONSTRAINT "RiskTaskAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorTaskAssignment" (
    "id" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "taskId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,

    CONSTRAINT "VendorTaskAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeRequiredTask" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeRequiredTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeTask" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "requiredTaskId" TEXT NOT NULL,
    "status" "EmployeeTaskStatus" NOT NULL DEFAULT 'assigned',
    "completedAt" TIMESTAMP(3),
    "overrideCompliant" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "department" "Departments" NOT NULL DEFAULT 'none',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "externalEmployeeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Policy" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "content" JSONB[],
    "version" TEXT,
    "usedBy" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Policy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolicyFile" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PolicyFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolicyFramework" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "frameworkId" TEXT NOT NULL,

    CONSTRAINT "PolicyFramework_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeePolicyAcceptance" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeePolicyAcceptance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolicyControl" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "controlId" TEXT NOT NULL,

    CONSTRAINT "PolicyControl_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ControlRequirement" (
    "id" TEXT NOT NULL,
    "controlId" TEXT NOT NULL,
    "type" "RequirementType" NOT NULL,
    "description" TEXT,
    "policyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ControlRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationPolicy" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "status" "PolicyStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "policyId" TEXT NOT NULL,
    "content" JSONB[],

    CONSTRAINT "OrganizationPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_subdomain_key" ON "Organization"("subdomain");

-- CreateIndex
CREATE INDEX "Organization_stripeCustomerId_idx" ON "Organization"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationIntegrations_name_key" ON "OrganizationIntegrations"("name");

-- CreateIndex
CREATE INDEX "OrganizationIntegrations_organizationId_idx" ON "OrganizationIntegrations"("organizationId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_idx" ON "AuditLog"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Framework_name_key" ON "Framework"("name");

-- CreateIndex
CREATE INDEX "Framework_id_idx" ON "Framework"("id");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationFramework_organizationId_frameworkId_key" ON "OrganizationFramework"("organizationId", "frameworkId");

-- CreateIndex
CREATE UNIQUE INDEX "FrameworkCategory_code_key" ON "FrameworkCategory"("code");

-- CreateIndex
CREATE INDEX "FrameworkCategory_frameworkId_idx" ON "FrameworkCategory"("frameworkId");

-- CreateIndex
CREATE UNIQUE INDEX "Control_code_key" ON "Control"("code");

-- CreateIndex
CREATE INDEX "Control_frameworkCategoryId_idx" ON "Control"("frameworkCategoryId");

-- CreateIndex
CREATE INDEX "OrganizationControl_organizationId_idx" ON "OrganizationControl"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationControl_organizationFrameworkId_idx" ON "OrganizationControl"("organizationFrameworkId");

-- CreateIndex
CREATE INDEX "OrganizationControl_controlId_idx" ON "OrganizationControl"("controlId");

-- CreateIndex
CREATE INDEX "Artifact_organizationId_idx" ON "Artifact"("organizationId");

-- CreateIndex
CREATE INDEX "Artifact_type_idx" ON "Artifact"("type");

-- CreateIndex
CREATE INDEX "ControlArtifact_organizationControlId_idx" ON "ControlArtifact"("organizationControlId");

-- CreateIndex
CREATE INDEX "ControlArtifact_artifactId_idx" ON "ControlArtifact"("artifactId");

-- CreateIndex
CREATE INDEX "Risk_organizationId_idx" ON "Risk"("organizationId");

-- CreateIndex
CREATE INDEX "Risk_ownerId_idx" ON "Risk"("ownerId");

-- CreateIndex
CREATE INDEX "Risk_category_idx" ON "Risk"("category");

-- CreateIndex
CREATE INDEX "Risk_status_idx" ON "Risk"("status");

-- CreateIndex
CREATE INDEX "RiskComment_riskId_idx" ON "RiskComment"("riskId");

-- CreateIndex
CREATE INDEX "RiskComment_ownerId_idx" ON "RiskComment"("ownerId");

-- CreateIndex
CREATE INDEX "RiskComment_organizationId_idx" ON "RiskComment"("organizationId");

-- CreateIndex
CREATE INDEX "RiskMitigationTask_riskId_idx" ON "RiskMitigationTask"("riskId");

-- CreateIndex
CREATE INDEX "RiskMitigationTask_ownerId_idx" ON "RiskMitigationTask"("ownerId");

-- CreateIndex
CREATE INDEX "RiskMitigationTask_organizationId_idx" ON "RiskMitigationTask"("organizationId");

-- CreateIndex
CREATE INDEX "TaskComments_riskId_idx" ON "TaskComments"("riskId");

-- CreateIndex
CREATE INDEX "TaskComments_riskMitigationTaskId_idx" ON "TaskComments"("riskMitigationTaskId");

-- CreateIndex
CREATE INDEX "TaskComments_organizationId_idx" ON "TaskComments"("organizationId");

-- CreateIndex
CREATE INDEX "TaskAttachment_riskMitigationTaskId_idx" ON "TaskAttachment"("riskMitigationTaskId");

-- CreateIndex
CREATE INDEX "TaskAttachment_organizationId_idx" ON "TaskAttachment"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "RiskTreatmentStrategy_riskId_key" ON "RiskTreatmentStrategy"("riskId");

-- CreateIndex
CREATE INDEX "RiskTreatmentStrategy_riskId_idx" ON "RiskTreatmentStrategy"("riskId");

-- CreateIndex
CREATE INDEX "Vendors_organizationId_idx" ON "Vendors"("organizationId");

-- CreateIndex
CREATE INDEX "Vendors_ownerId_idx" ON "Vendors"("ownerId");

-- CreateIndex
CREATE INDEX "Vendors_category_idx" ON "Vendors"("category");

-- CreateIndex
CREATE INDEX "Vendors_status_idx" ON "Vendors"("status");

-- CreateIndex
CREATE INDEX "VendorContact_vendorId_idx" ON "VendorContact"("vendorId");

-- CreateIndex
CREATE INDEX "VendorContact_organizationId_idx" ON "VendorContact"("organizationId");

-- CreateIndex
CREATE INDEX "VendorComment_vendorId_idx" ON "VendorComment"("vendorId");

-- CreateIndex
CREATE INDEX "VendorComment_ownerId_idx" ON "VendorComment"("ownerId");

-- CreateIndex
CREATE INDEX "VendorComment_organizationId_idx" ON "VendorComment"("organizationId");

-- CreateIndex
CREATE INDEX "VendorMitigationTask_vendorId_idx" ON "VendorMitigationTask"("vendorId");

-- CreateIndex
CREATE INDEX "VendorMitigationTask_ownerId_idx" ON "VendorMitigationTask"("ownerId");

-- CreateIndex
CREATE INDEX "VendorMitigationTask_organizationId_idx" ON "VendorMitigationTask"("organizationId");

-- CreateIndex
CREATE INDEX "VendorTaskComments_vendorMitigationTaskId_idx" ON "VendorTaskComments"("vendorMitigationTaskId");

-- CreateIndex
CREATE INDEX "VendorTaskComments_organizationId_idx" ON "VendorTaskComments"("organizationId");

-- CreateIndex
CREATE INDEX "VendorTaskAttachment_vendorMitigationTaskId_idx" ON "VendorTaskAttachment"("vendorMitigationTaskId");

-- CreateIndex
CREATE INDEX "VendorTaskAttachment_organizationId_idx" ON "VendorTaskAttachment"("organizationId");

-- CreateIndex
CREATE INDEX "VendorRiskAssessment_vendorId_idx" ON "VendorRiskAssessment"("vendorId");

-- CreateIndex
CREATE INDEX "VendorRiskAssessment_organizationId_idx" ON "VendorRiskAssessment"("organizationId");

-- CreateIndex
CREATE INDEX "RiskAttachment_riskId_idx" ON "RiskAttachment"("riskId");

-- CreateIndex
CREATE INDEX "RiskAttachment_organizationId_idx" ON "RiskAttachment"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationMember_organizationId_idx" ON "OrganizationMember"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationMember_userId_idx" ON "OrganizationMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMember_userId_organizationId_key" ON "OrganizationMember"("userId", "organizationId");

-- CreateIndex
CREATE INDEX "RiskTaskAssignment_taskId_idx" ON "RiskTaskAssignment"("taskId");

-- CreateIndex
CREATE INDEX "RiskTaskAssignment_employeeId_idx" ON "RiskTaskAssignment"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "RiskTaskAssignment_taskId_employeeId_key" ON "RiskTaskAssignment"("taskId", "employeeId");

-- CreateIndex
CREATE INDEX "VendorTaskAssignment_taskId_idx" ON "VendorTaskAssignment"("taskId");

-- CreateIndex
CREATE INDEX "VendorTaskAssignment_employeeId_idx" ON "VendorTaskAssignment"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorTaskAssignment_taskId_employeeId_key" ON "VendorTaskAssignment"("taskId", "employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeRequiredTask_code_key" ON "EmployeeRequiredTask"("code");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeTask_employeeId_requiredTaskId_key" ON "EmployeeTask"("employeeId", "requiredTaskId");

-- CreateIndex
CREATE INDEX "Employee_organizationId_idx" ON "Employee"("organizationId");

-- CreateIndex
CREATE INDEX "Employee_userId_idx" ON "Employee"("userId");

-- CreateIndex
CREATE INDEX "Employee_department_idx" ON "Employee"("department");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_email_organizationId_key" ON "Employee"("email", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Policy_slug_key" ON "Policy"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "PolicyFramework_policyId_frameworkId_key" ON "PolicyFramework"("policyId", "frameworkId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeePolicyAcceptance_employeeId_policyId_key" ON "EmployeePolicyAcceptance"("employeeId", "policyId");

-- CreateIndex
CREATE UNIQUE INDEX "PolicyControl_policyId_controlId_key" ON "PolicyControl"("policyId", "controlId");

-- CreateIndex
CREATE INDEX "ControlRequirement_controlId_idx" ON "ControlRequirement"("controlId");

-- CreateIndex
CREATE INDEX "OrganizationPolicy_organizationId_idx" ON "OrganizationPolicy"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationPolicy_policyId_idx" ON "OrganizationPolicy"("policyId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationPolicy_organizationId_policyId_key" ON "OrganizationPolicy"("organizationId", "policyId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_frameworkId_fkey" FOREIGN KEY ("frameworkId") REFERENCES "Framework"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationIntegrations" ADD CONSTRAINT "OrganizationIntegrations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationFramework" ADD CONSTRAINT "OrganizationFramework_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationFramework" ADD CONSTRAINT "OrganizationFramework_frameworkId_fkey" FOREIGN KEY ("frameworkId") REFERENCES "Framework"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrameworkCategory" ADD CONSTRAINT "FrameworkCategory_frameworkId_fkey" FOREIGN KEY ("frameworkId") REFERENCES "Framework"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Control" ADD CONSTRAINT "Control_frameworkCategoryId_fkey" FOREIGN KEY ("frameworkCategoryId") REFERENCES "FrameworkCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationControl" ADD CONSTRAINT "OrganizationControl_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationControl" ADD CONSTRAINT "OrganizationControl_controlId_fkey" FOREIGN KEY ("controlId") REFERENCES "Control"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationControl" ADD CONSTRAINT "OrganizationControl_organizationFrameworkId_fkey" FOREIGN KEY ("organizationFrameworkId") REFERENCES "OrganizationFramework"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Artifact" ADD CONSTRAINT "Artifact_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Artifact" ADD CONSTRAINT "Artifact_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControlArtifact" ADD CONSTRAINT "ControlArtifact_organizationControlId_fkey" FOREIGN KEY ("organizationControlId") REFERENCES "OrganizationControl"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControlArtifact" ADD CONSTRAINT "ControlArtifact_artifactId_fkey" FOREIGN KEY ("artifactId") REFERENCES "Artifact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Risk" ADD CONSTRAINT "Risk_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Risk" ADD CONSTRAINT "Risk_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskComment" ADD CONSTRAINT "RiskComment_riskId_fkey" FOREIGN KEY ("riskId") REFERENCES "Risk"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskComment" ADD CONSTRAINT "RiskComment_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskComment" ADD CONSTRAINT "RiskComment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskMitigationTask" ADD CONSTRAINT "RiskMitigationTask_riskId_fkey" FOREIGN KEY ("riskId") REFERENCES "Risk"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskMitigationTask" ADD CONSTRAINT "RiskMitigationTask_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskMitigationTask" ADD CONSTRAINT "RiskMitigationTask_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskComments" ADD CONSTRAINT "TaskComments_riskId_fkey" FOREIGN KEY ("riskId") REFERENCES "Risk"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskComments" ADD CONSTRAINT "TaskComments_riskMitigationTaskId_fkey" FOREIGN KEY ("riskMitigationTaskId") REFERENCES "RiskMitigationTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskComments" ADD CONSTRAINT "TaskComments_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskComments" ADD CONSTRAINT "TaskComments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAttachment" ADD CONSTRAINT "TaskAttachment_riskMitigationTaskId_fkey" FOREIGN KEY ("riskMitigationTaskId") REFERENCES "RiskMitigationTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAttachment" ADD CONSTRAINT "TaskAttachment_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAttachment" ADD CONSTRAINT "TaskAttachment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskTreatmentStrategy" ADD CONSTRAINT "RiskTreatmentStrategy_riskId_fkey" FOREIGN KEY ("riskId") REFERENCES "Risk"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vendors" ADD CONSTRAINT "Vendors_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vendors" ADD CONSTRAINT "Vendors_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorContact" ADD CONSTRAINT "VendorContact_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorContact" ADD CONSTRAINT "VendorContact_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorComment" ADD CONSTRAINT "VendorComment_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorComment" ADD CONSTRAINT "VendorComment_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorComment" ADD CONSTRAINT "VendorComment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorMitigationTask" ADD CONSTRAINT "VendorMitigationTask_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorMitigationTask" ADD CONSTRAINT "VendorMitigationTask_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorMitigationTask" ADD CONSTRAINT "VendorMitigationTask_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorTaskComments" ADD CONSTRAINT "VendorTaskComments_vendorMitigationTaskId_fkey" FOREIGN KEY ("vendorMitigationTaskId") REFERENCES "VendorMitigationTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorTaskComments" ADD CONSTRAINT "VendorTaskComments_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorTaskComments" ADD CONSTRAINT "VendorTaskComments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorTaskAttachment" ADD CONSTRAINT "VendorTaskAttachment_vendorMitigationTaskId_fkey" FOREIGN KEY ("vendorMitigationTaskId") REFERENCES "VendorMitigationTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorTaskAttachment" ADD CONSTRAINT "VendorTaskAttachment_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorTaskAttachment" ADD CONSTRAINT "VendorTaskAttachment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorRiskAssessment" ADD CONSTRAINT "VendorRiskAssessment_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorRiskAssessment" ADD CONSTRAINT "VendorRiskAssessment_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorRiskAssessment" ADD CONSTRAINT "VendorRiskAssessment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskAttachment" ADD CONSTRAINT "RiskAttachment_riskId_fkey" FOREIGN KEY ("riskId") REFERENCES "Risk"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskAttachment" ADD CONSTRAINT "RiskAttachment_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskAttachment" ADD CONSTRAINT "RiskAttachment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskTaskAssignment" ADD CONSTRAINT "RiskTaskAssignment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "RiskMitigationTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskTaskAssignment" ADD CONSTRAINT "RiskTaskAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorTaskAssignment" ADD CONSTRAINT "VendorTaskAssignment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "VendorMitigationTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorTaskAssignment" ADD CONSTRAINT "VendorTaskAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeTask" ADD CONSTRAINT "EmployeeTask_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeTask" ADD CONSTRAINT "EmployeeTask_requiredTaskId_fkey" FOREIGN KEY ("requiredTaskId") REFERENCES "EmployeeRequiredTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyFile" ADD CONSTRAINT "PolicyFile_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyFramework" ADD CONSTRAINT "PolicyFramework_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyFramework" ADD CONSTRAINT "PolicyFramework_frameworkId_fkey" FOREIGN KEY ("frameworkId") REFERENCES "Framework"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeePolicyAcceptance" ADD CONSTRAINT "EmployeePolicyAcceptance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeePolicyAcceptance" ADD CONSTRAINT "EmployeePolicyAcceptance_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyControl" ADD CONSTRAINT "PolicyControl_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PolicyControl" ADD CONSTRAINT "PolicyControl_controlId_fkey" FOREIGN KEY ("controlId") REFERENCES "Control"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControlRequirement" ADD CONSTRAINT "ControlRequirement_controlId_fkey" FOREIGN KEY ("controlId") REFERENCES "Control"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControlRequirement" ADD CONSTRAINT "ControlRequirement_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationPolicy" ADD CONSTRAINT "OrganizationPolicy_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationPolicy" ADD CONSTRAINT "OrganizationPolicy_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

