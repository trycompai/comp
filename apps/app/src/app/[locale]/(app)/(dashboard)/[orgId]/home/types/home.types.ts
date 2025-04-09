export interface TechStackOption {
  label: string;
  category: TechStackCategory;
  value: string;
}

export enum TechStackHostingProvider {
  VERCEL = "vercel",
  AWS = "aws",
  GOOGLE_CLOUD = "google-cloud",
  AZURE = "azure",
  NETLIFY = "netlify",
  HEROKU = "heroku",
  DIGITAL_OCEAN = "digital-ocean",
  CLOUDFLARE_PAGES = "cloudflare-pages",
  RENDER = "render",
  FLY_IO = "fly-io",
}

export const techStackHostingProviders = [
  TechStackHostingProvider.VERCEL,
  TechStackHostingProvider.AWS,
  TechStackHostingProvider.GOOGLE_CLOUD,
  TechStackHostingProvider.AZURE,
  TechStackHostingProvider.NETLIFY,
  TechStackHostingProvider.HEROKU,
  TechStackHostingProvider.DIGITAL_OCEAN,
  TechStackHostingProvider.CLOUDFLARE_PAGES,
  TechStackHostingProvider.RENDER,
  TechStackHostingProvider.FLY_IO,
] as const;

export enum TechStackFramework {
  NEXT_JS = "next-js",
  NUXT = "nuxt",
  VITE = "vite",
  REACT = "react",
  ANGULAR = "angular",
  VUE = "vue",
  SVELTE = "svelte",
  REMIX = "remix",
  ASTRO = "astro",
  GATSBY = "gatsby",
  NODE_EXPRESS = "node-express",
  DJANGO = "django",
  RAILS = "rails",
  LARAVEL = "laravel",
  SPRING_BOOT = "spring-boot",
}

export const techStackFrameworks = [
  TechStackFramework.NEXT_JS,
  TechStackFramework.NUXT,
  TechStackFramework.VITE,
  TechStackFramework.REACT,
  TechStackFramework.ANGULAR,
  TechStackFramework.VUE,
  TechStackFramework.SVELTE,
  TechStackFramework.REMIX,
  TechStackFramework.ASTRO,
  TechStackFramework.GATSBY,
  TechStackFramework.NODE_EXPRESS,
  TechStackFramework.DJANGO,
  TechStackFramework.RAILS,
  TechStackFramework.LARAVEL,
  TechStackFramework.SPRING_BOOT,
] as const;

export enum TechStackDatabase {
  POSTGRESQL = "postgresql",
  MYSQL = "mysql",
  SQLITE = "sqlite",
  MONGODB = "mongodb",
  REDIS = "redis",
  CASSANDRA = "cassandra",
  FIREBASE = "firebase",
  SUPABASE = "supabase",
  DYNAMODB = "dynamodb",
  COSMOSDB = "cosmosdb",
}

export const techStackDatabases = [
  TechStackDatabase.POSTGRESQL,
  TechStackDatabase.MYSQL,
  TechStackDatabase.SQLITE,
  TechStackDatabase.MONGODB,
  TechStackDatabase.REDIS,
  TechStackDatabase.CASSANDRA,
  TechStackDatabase.FIREBASE,
  TechStackDatabase.SUPABASE,
  TechStackDatabase.DYNAMODB,
  TechStackDatabase.COSMOSDB,
] as const;

export enum TechStackCategory {
  HOSTING_PROVIDER = "hosting-provider",
  FRAMEWORK = "framework",
  DATABASE = "database",
}

export const techStackCategories = [
  TechStackCategory.HOSTING_PROVIDER,
  TechStackCategory.FRAMEWORK,
  TechStackCategory.DATABASE,
] as const;

// Helper function to format enum values into labels
function formatLabel(value: string): string {
  return value
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export const techStackOptions: TechStackOption[] = [
  ...techStackHostingProviders.map((value) => ({
    label: formatLabel(value),
    category: TechStackCategory.HOSTING_PROVIDER,
    value,
  })),
  ...techStackFrameworks.map((value) => ({
    label: formatLabel(value),
    category: TechStackCategory.FRAMEWORK,
    value,
  })),
  ...techStackDatabases.map((value) => ({
    label: formatLabel(value),
    category: TechStackCategory.DATABASE,
    value,
  })),
];

// Question Types Definition
// Base interface needs to be exported for other types to use it
export interface BaseQuestion {
  title: string;
  description?: string;
}

// Removed MultiSelectQuestionData - moved to MultiSelectQuestion.types.ts
/*
interface MultiSelectQuestionData extends BaseQuestion {
  type: "multi-select";
  options: TechStackOption[]; // Use the existing TechStackOption
}
*/

// Removed TextInputQuestionData - moved to TextInputQuestion.types.ts
/*
interface TextInputQuestionData extends BaseQuestion {
  type: "text";
  // Add specific props for text input if needed, e.g., placeholder
}
*/

// Define the structure for an action block
export interface ActionBlockData extends BaseQuestion {
  id: string; // Unique identifier
  type: "action-block";
  buttonLabel: string;
  buttonLink: string; // URL/path for the button
}

// Define the structure for a wizard launcher block
export interface WizardLauncherData extends BaseQuestion {
  id: string; // Unique identifier
  type: "wizard-launcher";
  buttonLabel: string;
  wizardId: string; // Identifier for which wizard to launch
}

// Keep the Discriminated Union for Questions
// We need to import the specific types now
import type { MultiSelectQuestionData } from "./MultiSelectQuestion.types";
import type { TextInputQuestionData } from "./TextInputQuestion.types";

export type QuestionData =
  | MultiSelectQuestionData
  | TextInputQuestionData
  | ActionBlockData
  | WizardLauncherData;

// Define the structure for a category containing questions
export interface CategoryData {
  title: string;
  description?: string;
  questions: QuestionData[];
}
