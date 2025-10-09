export interface AutomationExample {
  title: string;
  prompt: string;
  url: string;
}

export const AUTOMATION_EXAMPLES: AutomationExample[] = [
  {
    title: 'Check if I have dependabot enabled in my GitHub repository',
    prompt: 'Check if I have dependabot enabled in my GitHub repository',
    url: 'https://img.logo.dev/github.com?token=pk_AZatYxV5QDSfWpRDaBxzRQ',
  },
  {
    title: 'Check if I have branch protection enabled for the main branch in my GitHub repository',
    prompt: 'Check if I have branch protection enabled for the main branch in my GitHub repository',
    url: 'https://img.logo.dev/github.com?token=pk_AZatYxV5QDSfWpRDaBxzRQ',
  },
  {
    title: 'Check if my website has a privacy policy',
    prompt: 'Check if my website has a privacy policy',
    url: 'https://img.logo.dev/trycomp.ai?token=pk_AZatYxV5QDSfWpRDaBxzRQ',
  },
  {
    title: 'Give me a list of failed deployments in my Vercel project',
    prompt: 'Give me a list of failed deployments in my Vercel project',
    url: 'https://img.logo.dev/vercel.com?token=pk_AZatYxV5QDSfWpRDaBxzRQ',
  },
  {
    title: 'Check that DDoS protection is enabled for my Cloudflare project',
    prompt: 'Check that DDoS protection is enabled for my Cloudflare project',
    url: 'https://img.logo.dev/cloudflare.com?token=pk_AZatYxV5QDSfWpRDaBxzRQ',
  },
];
