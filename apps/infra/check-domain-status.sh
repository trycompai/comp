#!/bin/bash

echo "🔍 CHECKING SSL CERTIFICATES & DNS STATUS"
echo "========================================"

export AWS_PAGER=""

# Get certificate status
echo ""
echo "📜 SSL Certificate Status:"
aws acm list-certificates --region us-east-1 \
  --query "CertificateSummaryList[?contains(DomainName, 'trycomp.ai')].{Domain:DomainName,Status:Status}" \
  --output table

echo ""
echo "🌐 DNS Record Status:"

# Check SSL validation records
echo ""
echo "✅ SSL Validation Records:"
echo "  app-aws validation:"
dig _8ffa855be73145a5b11081b41c94a817.app-aws.trycomp.ai CNAME +short || echo "    ❌ Not found"

echo "  portal-aws validation:"
dig _eb89d8e153fcd05e3a085a83c16fffea.portal-aws.trycomp.ai CNAME +short || echo "    ❌ Not found"

# Check domain pointing records
echo ""
echo "🎯 Domain Pointing Records:"
echo "  app-aws.trycomp.ai:"
APP_RESULT=$(dig app-aws.trycomp.ai CNAME +short)
if [ -z "$APP_RESULT" ]; then
  echo "    ❌ Not found"
else
  echo "    ✅ $APP_RESULT"
fi

echo "  portal-aws.trycomp.ai:"
PORTAL_RESULT=$(dig portal-aws.trycomp.ai CNAME +short)
if [ -z "$PORTAL_RESULT" ]; then
  echo "    ❌ Not found"
else
  echo "    ✅ $PORTAL_RESULT"
fi

echo ""
echo "🚀 Next Steps:"
if [ -z "$APP_RESULT" ] || [ -z "$PORTAL_RESULT" ]; then
  echo "  1. Add missing CNAME records to your DNS provider"
  echo "  2. Run: pulumi stack output allDnsRecords"
  echo "  3. Wait 5-10 minutes for certificate validation"
  echo "  4. Run: pulumi config set comp-mariano-test:enableHttps true && pulumi up"
else
  echo "  🎉 All DNS records are set! Certificates should validate soon."
  echo "  Run this script again in a few minutes to check validation status."
fi
