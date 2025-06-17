export default {
  auth: {
    title: 'Employee Portal',
    description: 'Enter your email address to receive a one time password.',
    options: 'More options',
    email: {
      otp_sent: 'One time password sent',
      otp_description: 'Check your email for the one time password',
      otp_try_again: 'Try again',
      placeholder: 'Your work email',
      button: 'Continue',
    },
  },
  powered_by: {
    title: 'Comp AI - OSS Compliance Platform',
    description:
      'Get SOC 2, ISO 27001, and GDPR compliant in weeks, not months. Open source, instant sign up, free trial.',
    learn_more: 'Start Free Trial & Get Compliant',
    learn_more_link: 'https://trycomp.ai',
  },
  user_menu: {
    theme: 'Theme',
    language: 'Language',
    sign_out: 'Sign Out',
  },
  not_found: {
    title: 'Not Found',
    description: 'The page you are looking for does not exist.',
    return: 'Return to the home page',
  },
  sidebar: {
    dashboard: 'Employee Portal Overview',
  },
  language: {
    placeholder: 'Select Language',
  },
  theme: {
    options: {
      dark: 'Dark',
      light: 'Light',
      system: 'System',
    },
  },
} as const;
