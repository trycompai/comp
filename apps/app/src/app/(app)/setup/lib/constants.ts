import { z } from 'zod';
import { Step } from './types';

export const STORAGE_KEY = 'onboarding_answers';

export const companyDetailsSchema = z.object({
  frameworkIds: z.array(z.string()).min(1, 'Please select at least one framework'),
  organizationName: z.string().min(2, 'Organization name must be at least 2 characters'),
  website: z.string().url('Please enter a valid URL'),
  describe: z
    .string()
    .min(1, 'Please provide a brief overview and description of what your company does')
    .max(300, 'Description must be less than 300 characters'),
  industry: z.string().min(1, 'Please select your industry'),
  teamSize: z.string().min(1, 'Please enter your team size'),
  cSuite: z
    .array(
      z.object({
        name: z.string().min(1, 'Name is required'),
        title: z.string().min(1, 'Title is required'),
      }),
    )
    .min(1, 'Please add at least one executive'),
  reportSignatory: z.object({
    fullName: z.string().min(1, 'Full name is required'),
    jobTitle: z.string().min(1, 'Job title is required'),
    email: z.string().email('Please enter a valid email'),
  }),
  software: z.string().optional(),
  infrastructure: z.string().min(1, 'Please select your infrastructure'),
  dataTypes: z.string().min(1, 'Please select types of data you handle'),
  devices: z.string().min(1, 'Please select device types'),
  authentication: z.string().min(1, 'Please select authentication methods'),
  workLocation: z.string().min(1, 'Please select work arrangement'),
  geo: z.string().min(1, 'Please select where your data is located'),
  shipping: z.object({
    fullName: z.string().min(1, 'Full name is required'),
    address: z.string().min(1, 'Address is required'),
    phone: z.string().min(1, 'Phone number is required'),
  }),
});

export const steps: Step[] = [
  {
    key: 'frameworkIds',
    question: 'Which compliance frameworks do you need?',
    placeholder: 'Select the frameworks that apply to your business',
  },
  {
    key: 'organizationName',
    question: 'What is your company name?',
    placeholder: 'e.g., Acme Inc.',
  },
  {
    key: 'website',
    question: "What's your company website?",
    placeholder: 'example.com',
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
    placeholder: 'e.g., 25',
    description:
      'We need an approximate count for your compliance reports. You can update this in settings if it changes.',
  },
  {
    key: 'cSuite',
    question: 'Who are your C-Suite executives?',
    placeholder: '',
    description:
      'These names and titles will appear in your compliance reports. You can update this in settings if it changes.',
  },
  {
    key: 'reportSignatory',
    question: 'Who will sign off on the final report?',
    placeholder: '',
    description: 'This person will be listed as the authorizing signatory on compliance reports.',
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
    skippable: true,
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
    options: ['Fully remote', 'Hybrid (office + remote)', 'Office-based'],
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
  {
    key: 'geo',
    question: 'Where is your data located?',
    placeholder: 'e.g., North America',
    options: [
      'North America',
      'Europe (EU)',
      'United Kingdom',
      'Asia-Pacific',
      'South America',
      'Africa',
      'Middle East',
      'Australia/New Zealand',
    ],
  },
  {
    key: 'shipping',
    question: 'Where would you like to receive your certificate?',
    placeholder: '',
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
