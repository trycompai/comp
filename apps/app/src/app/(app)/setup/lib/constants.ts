import { z } from 'zod';
import { InlineTranslationOptions } from 'gt-next/types';
import { Step } from './types';

export const STORAGE_KEY = 'onboarding_answers';

export const getCompanyDetailsSchema = (t: (content: string, options?: InlineTranslationOptions) => string) => z.object({
  frameworkIds: z.array(z.string()).min(1, t('Please select at least one framework')),
  organizationName: z.string().min(2, t('Organization name must be at least 2 characters')),
  website: z.string().url(t('Please enter a valid URL')),
  describe: z
    .string()
    .min(1, t('Please provide a brief overview and description of what your company does'))
    .max(300, t('Description must be less than 300 characters')),
  industry: z.string().min(1, t('Please select your industry')),
  teamSize: z.string().min(1, t('Please select your team size')),
  software: z.string().min(1, t('Please select software you use')),
  infrastructure: z.string().min(1, t('Please select your infrastructure')),
  dataTypes: z.string().min(1, t('Please select types of data you handle')),
  devices: z.string().min(1, t('Please select device types')),
  authentication: z.string().min(1, t('Please select authentication methods')),
  workLocation: z.string().min(1, t('Please select work arrangement')),
});

export const getSteps = (t: (content: string, options?: InlineTranslationOptions) => string): Step[] => {
  return [
  {
    key: 'frameworkIds',
    question: t('Which compliance frameworks do you need?'),
    placeholder: t('Select the frameworks that apply to your business'),
  },
  {
    key: 'organizationName',
    question: t('What is your company name?'),
    placeholder: t('e.g., Acme Inc.'),
  },
  {
    key: 'website',
    question: t("What's your company website?"),
    placeholder: t('example.com'),
  },
  {
    key: 'describe',
    question: t('Describe your company in a few sentences'),
    placeholder: t('e.g., We are a software company that builds tools for businesses to manage their employees.'),
  },
  {
    key: 'industry',
    question: t('What industry is your company in?'),
    placeholder: t('e.g., SaaS'),
    options: [t('SaaS'), t('FinTech'), t('Healthcare'), t('E-commerce'), t('Education'), t('Other')],
  },
  {
    key: 'teamSize',
    question: t('How many employees do you have?'),
    placeholder: t('e.g., 11-50'),
    options: [t('1-10'), t('11-50'), t('51-200'), t('201-500'), t('500+')],
  },
  {
    key: 'devices',
    question: t('What devices do your team members use?'),
    placeholder: t('e.g., Company laptops'),
    options: [
      t('Company-provided laptops'),
      t('Personal laptops'),
      t('Company phones'),
      t('Personal phones'),
      t('Tablets'),
      t('Other'),
    ],
  },
  {
    key: 'authentication',
    question: t('How do your team members sign in to work tools?'),
    placeholder: t('e.g., Google Workspace'),
    options: [t('Google Workspace'), t('Microsoft 365'), t('Okta'), t('Auth0'), t('Email/Password'), t('Other')],
  },
  {
    key: 'software',
    question: t('What software do you use?'),
    placeholder: t('e.g., Rippling'),
    options: [
      t('Rippling'),
      t('Gusto'),
      t('Salesforce'),
      t('HubSpot'),
      t('Slack'),
      t('Zoom'),
      t('Notion'),
      t('Linear'),
      t('Jira'),
      t('Confluence'),
      t('GitHub'),
      t('GitLab'),
      t('Figma'),
      t('Stripe'),
      t('Other'),
    ],
  },
  {
    key: 'workLocation',
    question: t('How does your team work?'),
    placeholder: t('e.g., Remote'),
    options: [t('Fully remote'), t('Hybrid (office + remote)'), t('Office-based')],
  },
  {
    key: 'infrastructure',
    question: t('Where do you host your applications and data?'),
    placeholder: t('e.g., AWS'),
    options: [t('AWS'), t('Google Cloud'), t('Microsoft Azure'), t('Heroku'), t('Vercel'), t('Other')],
  },
  {
    key: 'dataTypes',
    question: t('What types of data do you handle?'),
    placeholder: t('e.g., Customer information'),
    options: [
      t('Customer PII'),
      t('Payment information'),
      t('Employee data'),
      t('Health records'),
      t('Intellectual property'),
      t('Other'),
    ],
  },
];
};

export const getWelcomeText = (t: (content: string, options?: InlineTranslationOptions) => string) => [
  t('Welcome to Comp AI!'),
  t("Let's set up your security and compliance program. I'll help you:"),
  t('• Generate relevant vendors and risks for your business'),
  t('• Create customized security policies'),
  t('• Set up compliance controls'),
  t('Your responses will be securely stored. You can leave this page at any time, your answers will be saved.'),
].join('\n\n');
