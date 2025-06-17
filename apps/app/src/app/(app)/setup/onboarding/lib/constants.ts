import { z } from 'zod';
import { Step } from './types';

export const STORAGE_KEY = 'onboarding_answers';

export const companyDetailsSchema = z.object({
  legalName: z.string().min(2, 'Company name must be at least 2 characters'),
  website: z.string().url('Please enter a valid URL'),
  describe: z
    .string()
    .min(1, 'Please provide a brief overview and description of what your company does')
    .max(300, 'Description must be less than 300 characters'),
  industry: z.string().min(1, 'Please select your industry'),
  teamSize: z.string().min(1, 'Please select your team size'),
  software: z.string().min(1, 'Please select software you use'),
  infrastructure: z.string().min(1, 'Please select your infrastructure'),
  dataTypes: z.string().min(1, 'Please select types of data you handle'),
  devices: z.string().min(1, 'Please select device types'),
  authentication: z.string().min(1, 'Please select authentication methods'),
  workLocation: z.string().min(1, 'Please select work arrangement'),
});

export const steps: Step[] = [
  {
    key: 'legalName',
    question: "What's your company name?",
    placeholder: 'e.g., Acme Inc.',
  },
  {
    key: 'website',
    question: "What's your company website?",
    placeholder: 'e.g., https://www.acme.com',
  },
  {
    key: 'describe',
    question: 'Describe your company in a few sentences',
    placeholder:
      'e.g., We are a software company that builds tools for businesses to manage their employees.',
  },
  {
    key: 'industry',
    question: 'What industry is your company in?',
    placeholder: 'e.g., SaaS',
    options: ['SaaS', 'FinTech', 'Healthcare', 'E-commerce', 'Education', 'Other'],
  },
  {
    key: 'teamSize',
    question: 'How many employees do you have?',
    placeholder: 'e.g., 10-50',
    options: ['1-10', '11-50', '51-200', '201-500', '500+'],
  },
  {
    key: 'devices',
    question: 'What devices do your team members use?',
    placeholder: 'e.g., Company laptops',
    options: [
      'Company-provided laptops',
      'Personal laptops',
      'Company phones',
      'Personal phones',
      'Tablets',
      'Other',
    ],
  },
  {
    key: 'authentication',
    question: 'How do your team members sign in to work tools?',
    placeholder: 'e.g., Google Workspace',
    options: ['Google Workspace', 'Microsoft 365', 'Okta', 'Auth0', 'Email/Password', 'Other'],
  },
  {
    key: 'software',
    question: 'What software do you use?',
    placeholder: 'e.g., Rippling',
    options: [
      'Rippling',
      'Gusto',
      'Salesforce',
      'HubSpot',
      'Slack',
      'Zoom',
      'Notion',
      'Linear',
      'Jira',
      'Confluence',
      'GitHub',
      'GitLab',
      'Figma',
      'Stripe',
      'Other',
    ],
  },
  {
    key: 'workLocation',
    question: 'How does your team work?',
    placeholder: 'e.g., Remote',
    options: ['Fully remote', 'Hybrid (office + remote)', 'Office-based', 'Other'],
  },
  {
    key: 'infrastructure',
    question: 'Where do you host your applications and data?',
    placeholder: 'e.g., AWS',
    options: ['AWS', 'Google Cloud', 'Microsoft Azure', 'Heroku', 'Vercel', 'Other'],
  },
  {
    key: 'dataTypes',
    question: 'What types of data do you handle?',
    placeholder: 'e.g., Customer information',
    options: [
      'Customer PII',
      'Payment information',
      'Employee data',
      'Health records',
      'Intellectual property',
      'Other',
    ],
  },
];

export const welcomeText = [
  'Welcome to Comp AI!',
  "Let's set up your security and compliance program. I'll help you:",
  '• Generate relevant vendors and risks for your business',
  '• Create customized security policies',
  '• Set up compliance controls',
  'Your responses will be securely stored. You can leave this page at any time, your answers will be saved.',
].join('\n\n');
