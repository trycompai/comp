'use client';

import { Badge } from '@comp/ui/badge';
import { Button } from '@comp/ui/button';
import { Input } from '@comp/ui/input';
import { ScrollArea } from '@comp/ui/scroll-area';
import { Check, Plus, X } from 'lucide-react';
import { useState } from 'react';

interface SoftwareCategory {
  name: string;
  options: string[];
}

const softwareCategories: SoftwareCategory[] = [
  {
    name: 'Productivity & Office Suites',
    options: [
      'Microsoft Office 365',
      'Google Workspace',
      'LibreOffice',
      'Notion',
      'Evernote',
      'Zoho Office Suite',
    ],
  },
  {
    name: 'Email & Communication',
    options: [
      'Microsoft Outlook',
      'Gmail',
      'Mozilla Thunderbird',
      'Slack',
      'Microsoft Teams',
      'Zoom',
      'Cisco WebEx',
      'Google Meet',
      'Skype for Business',
    ],
  },
  {
    name: 'File Storage & Collaboration',
    options: ['Google Drive', 'Dropbox', 'Microsoft OneDrive', 'Box', 'SharePoint'],
  },
  {
    name: 'Security & Antivirus',
    options: [
      'Norton Security',
      'McAfee',
      'Bitdefender',
      'Kaspersky',
      'Windows Defender',
      'CrowdStrike',
      'Sophos',
      'ESET',
      'Cisco Umbrella',
      'Okta (SSO & IAM)',
    ],
  },
  {
    name: 'Accounting & Finance',
    options: [
      'QuickBooks',
      'Xero',
      'Sage 50',
      'Sage Business Cloud',
      'MYOB',
      'FreshBooks',
      'Wave Accounting',
      'SAP',
      'Oracle NetSuite',
    ],
  },
  {
    name: 'CRM',
    options: ['Salesforce', 'HubSpot', 'Pipedrive', 'Zoho CRM', 'Monday.com'],
  },
  {
    name: 'Development & Project Management',
    options: [
      'GitHub',
      'GitLab',
      'Bitbucket',
      'Jira',
      'Confluence',
      'Linear',
      'Asana',
      'Trello',
      'Basecamp',
    ],
  },
  {
    name: 'Design',
    options: ['Figma', 'Adobe Creative Cloud', 'Sketch', 'Canva'],
  },
  {
    name: 'HR & Payroll',
    options: ['Rippling', 'Gusto', 'BambooHR', 'Workday', 'ADP'],
  },
  {
    name: 'Other',
    options: ['Stripe'],
  },
];

interface SoftwareSelectionProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export function SoftwareSelection({ value, onChange }: SoftwareSelectionProps) {
  const [customInput, setCustomInput] = useState('');
  const selectedSet = new Set(value);

  const handleToggle = (software: string) => {
    const newSelected = new Set(selectedSet);
    if (newSelected.has(software)) {
      newSelected.delete(software);
    } else {
      newSelected.add(software);
    }
    onChange(Array.from(newSelected));
  };

  const handleAddCustom = () => {
    if (customInput.trim() && !selectedSet.has(customInput.trim())) {
      onChange([...value, customInput.trim()]);
      setCustomInput('');
    }
  };

  const handleRemoveCustom = (software: string) => {
    onChange(value.filter((s) => s !== software));
  };

  // Get custom software (items not in predefined categories)
  const allPredefinedSoftware = softwareCategories.flatMap((cat) => cat.options);
  const customSoftware = value.filter((s) => !allPredefinedSoftware.includes(s));

  return (
    <div className="space-y-4">
      {/* Selected items */}
      {value.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Selected ({value.length}):</p>
          <div className="flex flex-wrap gap-2">
            {value.map((software) => (
              <Badge key={software} variant="secondary" className="gap-1">
                {software}
                <button
                  type="button"
                  onClick={() => handleRemoveCustom(software)}
                  className="ml-1 rounded-full hover:bg-muted"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Custom input */}
      <div className="flex gap-2">
        <Input
          placeholder="Add custom software (e.g., Internal tools)"
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAddCustom();
            }
          }}
        />
        <Button
          type="button"
          size="icon"
          variant="outline"
          onClick={handleAddCustom}
          disabled={!customInput.trim()}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Categories */}
      <ScrollArea className="h-[400px] w-full rounded-md border p-4">
        <div className="space-y-6">
          {softwareCategories.map((category) => (
            <div key={category.name} className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">{category.name}</h4>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {category.options.map((software) => {
                  const isSelected = selectedSet.has(software);
                  return (
                    <button
                      key={software}
                      type="button"
                      onClick={() => handleToggle(software)}
                      className={`flex items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors hover:bg-accent ${
                        isSelected
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-input'
                      }`}
                    >
                      <span>{software}</span>
                      {isSelected && <Check className="h-4 w-4" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}