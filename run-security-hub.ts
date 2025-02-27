#!/usr/bin/env bun

import { fetchSecurityFindings } from './packages/integrations/src/aws/src/index';

/**
 * Main function to execute security findings retrieval and processing
 */
async function main() {
  console.log('Fetching AWS Security Hub findings...');
  
  try {
    const findings = await fetchSecurityFindings();
    
    console.log('=== Security Hub Findings Summary ===');
    console.log(`Total findings: ${findings.length}`);
    
    // Group findings by severity
    const groupedBySeverity = findings.reduce((acc, finding) => {
      const severity = finding.Severity?.Label || 'UNKNOWN';
      acc[severity] = (acc[severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Display severity summary
    console.log('\nSeverity breakdown:');
    Object.entries(groupedBySeverity).forEach(([severity, count]) => {
      console.log(`  ${severity}: ${count} findings`);
    });
    
    // Display detailed information for critical and high severity findings
    const highSeverityFindings = findings.filter(f => 
      f.Severity?.Label === 'CRITICAL' || f.Severity?.Label === 'HIGH'
    );
    
    if (highSeverityFindings.length > 0) {
      console.log('\n=== Critical and High Severity Findings ===');
      highSeverityFindings.forEach((finding, index) => {
        console.log(`\n${index + 1}. ${finding.Title}`);
        console.log(`   Severity: ${finding.Severity?.Label}`);
        console.log(`   Resource: ${finding.Resources?.[0]?.Id || 'Unknown'}`);
        console.log(`   Description: ${finding.Description}`);
        console.log(`   Remediation: ${finding.Remediation?.Recommendation?.Text || 'Not provided'}`);
      });
    }
    
    return findings;
  } catch (error) {
    console.error('Error executing Security Hub findings retrieval:', error);
    process.exit(1);
  }
}

// Execute the main function
main()
  .then(() => {
    console.log('\nSecurity Hub findings retrieval completed successfully.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });