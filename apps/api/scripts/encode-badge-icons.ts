/**
 * Script to extract SVG badge icons from logos.tsx and encode them as base64 data URLs
 * Run with: bun run apps/api/scripts/encode-badge-icons.ts
 */

const fs = require('fs');
const path = require('path');

// Read the logos.tsx file
const logosPath = path.join(__dirname, '../../app/src/app/(app)/[orgId]/trust/portal-settings/components/logos.tsx');
const logosContent = fs.readFileSync(logosPath, 'utf-8');

// Extract SVG content for each icon
function extractSvg(componentName: string): string | null {
  // Find the component export
  const regex = new RegExp(`export const ${componentName} = \\(props.*?\\) => \\(\\s*(<svg[\\s\\S]*?<\\/svg>)\\s*\\);`, 's');
  const match = logosContent.match(regex);
  
  if (!match) {
    console.warn(`Warning: Could not find ${componentName}`);
    return null;
  }
  
  return match[1]
    .replace(/\{props\}/g, '') // Remove {props} spread
    .replace(/\{\.\.\.props\}/g, '') // Remove {...props} spread
    .trim();
}

// Badge components to extract
const badges = [
  { name: 'SOC2Type2', type: 'soc2', label: 'SOC 2' },
  { name: 'ISO27001', type: 'iso27001', label: 'ISO 27001' },
  { name: 'ISO42001', type: 'iso42001', label: 'ISO 42001' },
  { name: 'GDPR', type: 'gdpr', label: 'GDPR' },
  { name: 'HIPAA', type: 'hipaa', label: 'HIPAA' },
  { name: 'PCIDSS', type: 'pci_dss', label: 'PCI DSS' },
  { name: 'NEN7510', type: 'nen7510', label: 'NEN 7510' },
  { name: 'ISO9001', type: 'iso9001', label: 'ISO 9001' },
];

console.log('Extracting and encoding badge icons...\n');

const encodedBadges: Record<string, { icon: string; label: string }> = {};

for (const badge of badges) {
  const svgContent = extractSvg(badge.name);
  
  if (svgContent) {
    // Encode as base64
    const base64 = Buffer.from(svgContent).toString('base64');
    const dataUrl = `data:image/svg+xml;base64,${base64}`;
    
    encodedBadges[badge.type] = {
      icon: dataUrl,
      label: badge.label,
    };
    
    console.log(`✓ ${badge.label} (${badge.name})`);
  }
}

// Read the service file
const servicePath = path.join(__dirname, '../src/trust-portal/trust-access.service.ts');
let serviceContent = fs.readFileSync(servicePath, 'utf-8');

// Generate the new BADGE_ICON_MAP code
const newMapCode = `const BADGE_ICON_MAP: Record<string, { icon: string; label: string }> = {
${Object.entries(encodedBadges).map(([type, data]) => 
  `      ${type}: {
        icon: '${data.icon}',
        label: '${data.label}',
      },`
).join('\n')}
    };`;

// Replace the old BADGE_ICON_MAP with the new one
const mapRegex = /const BADGE_ICON_MAP: Record<string, \{ icon: string; label: string \}> = \{[\s\S]*?\};/;

if (mapRegex.test(serviceContent)) {
  serviceContent = serviceContent.replace(mapRegex, newMapCode);
  fs.writeFileSync(servicePath, serviceContent, 'utf-8');
  console.log('\n✅ Successfully updated trust-access.service.ts with encoded badge icons!');
} else {
  console.error('\n❌ Could not find BADGE_ICON_MAP in trust-access.service.ts');
  console.log('\nGenerated code:\n');
  console.log(newMapCode);
}
