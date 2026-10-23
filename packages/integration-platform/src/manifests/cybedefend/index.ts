import type { IntegrationManifest } from '../../types';
import { sastCheck, scaCheck } from './checks';
import {
  cybedefendCredentialFields,
  cybedefendCredentialSchema,
  cybedefendSetupInstructions,
} from './credentials';

export const manifest: IntegrationManifest = {
  id: 'cybedefend',
  name: 'CybeDefend',
  description:
    'Connect CybeDefend to evidence code scanning and dependency vulnerability management across your projects.',
  category: 'Security',
  /** Inlined: the logo lookup service returns a generic result for this domain. */
  logoUrl:
    'data:image/svg+xml;base64,PHN2ZyBpZD0iTWFzdGVyX0xvZ29zIiBkYXRhLW5hbWU9Ik1hc3RlciBMb2dvcyIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB2aWV3Qm94PSIwIDAgOTYgOTYiPjxkZWZzPjxzdHlsZT4gLmNscy0xIHsgZmlsbDogIzdCNUJGRjsgfSA8L3N0eWxlPjwvZGVmcz48cGF0aCBjbGFzcz0iY2xzLTEiIGQ9Ik0yNS43LDc2LjY0TDMuNjUsNTQuNThjLTQuODYtNC44Ni00Ljg2LTEyLjc1LDAtMTcuNjFMMjUuNywxNC45MmMxLjE3LTEuMTcsMi43NS0xLjgyLDQuNC0xLjgyaDIyLjM0cy03LjA1LDEwLjU3LTcuMDUsMTAuNTdjLTEuMTUsMS43My0zLjEsMi43Ny01LjE4LDIuNzdoLTMuNDljLTIuMzYsMC00LjYyLjk0LTYuMjksMi42aDBjLTkuMjQsOS4yNC05LjI0LDI0LjIzLDAsMzMuNDhoMGMxLjY3LDEuNjcsMy45MywyLjYsNi4yOSwyLjZoNS4yNmMuODYsMCwxLjU2LjcsMS41NiwxLjU2djExLjc4aC0xMy40NWMtMS42NSwwLTMuMjMtLjY2LTQuNC0xLjgyWiIvPjxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTQzLjU1LDgyLjkxbDcuMDUtMTAuNTdjMS4xNS0xLjczLDMuMS0yLjc3LDUuMTgtMi43N2gzLjQ5YzIuMzYsMCw0LjYyLS45NCw2LjI5LTIuNmgwYzkuMjQtOS4yNCw5LjI0LTI0LjIzLDAtMzMuNDhoMGMtMS42Ny0xLjY3LTMuOTMtMi42LTYuMjktMi42aC0xNS43MXM3LjA1LTEwLjU3LDcuMDUtMTAuNTdjMS4xNS0xLjczLDMuMS0yLjc3LDUuMTgtMi43N2gxMC4xMmMxLjY1LDAsMy4yMy42Niw0LjQsMS44MmwyMi4wNiwyMi4wNmM0Ljg2LDQuODYsNC44NiwxMi43NSwwLDE3LjYxbC0yMi4wNiwyMi4wNmMtMS4xNywxLjE3LTIuNzUsMS44Mi00LjQsMS44MmgtMjIuMzRaIi8+PHBhdGggY2xhc3M9ImNscy0xIiBkPSJNNTcuODYsNDhjMCw1LjUxLTQuNzcsOS45LTEwLjQsOS4yOC00LjI3LS40Ny03Ljc1LTMuOTQtOC4yMi04LjIyLS42Mi01LjYzLDMuNzctMTAuNCw5LjI4LTEwLjQsMS4wOSwwLDIuMTQuMTksMy4xMS41MnYyLjU5YzAsMS43MiwxLjM5LDMuMTEsMy4xMSwzLjExaDIuNTljLjM0Ljk3LjUyLDIuMDIuNTIsMy4xMVoiLz48L3N2Zz4=',
  docsUrl: 'https://docs.cybedefend.com',

  /** Empty on purpose: each check derives its URLs from the chosen region. */
  baseUrl: '',

  auth: {
    type: 'custom',
    config: {
      description:
        'CybeDefend personal access token, exchanged for a short-lived API token on every run.',
      credentialFields: cybedefendCredentialFields,
      validationSchema: cybedefendCredentialSchema,
      setupInstructions: cybedefendSetupInstructions,
    },
  },

  capabilities: ['checks'],

  services: [
    {
      id: 'code-scanning',
      name: 'Code Scanning',
      description: 'Static analysis findings per project',
      enabledByDefault: true,
      implemented: true,
    },
    {
      id: 'dependency-scanning',
      name: 'Dependency Scanning',
      description: 'Software composition analysis findings per project',
      enabledByDefault: true,
      implemented: true,
    },
  ],

  checks: [sastCheck, scaCheck],

  isActive: true,
};

export default manifest;
