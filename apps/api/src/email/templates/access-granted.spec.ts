import { renderToStaticMarkup } from 'react-dom/server';
import { AccessGrantedEmail } from './access-granted';

const baseProps = {
  toName: 'Chang Liu',
  organizationName: 'Acme Security',
  expiresAt: new Date('2026-12-31T00:00:00Z'),
  portalUrl: 'https://portal.example.com/access/token',
};

describe('AccessGrantedEmail', () => {
  it('omits all NDA copy when access was granted via allow-list bypass', () => {
    const html = renderToStaticMarkup(
      AccessGrantedEmail({ ...baseProps, ndaBypassed: true }),
    );

    // No NDA was signed, so the email must not reference one.
    expect(html).not.toContain('NDA');
    expect(html).not.toContain('signed');
    // The access confirmation itself is still present.
    expect(html).toContain('is now active');
    expect(html).toContain('Acme Security');
  });

  it('includes NDA copy for the standard NDA-signed flow', () => {
    const html = renderToStaticMarkup(
      AccessGrantedEmail({ ...baseProps, ndaBypassed: false }),
    );

    expect(html).toContain('Your NDA has been signed');
    expect(html).toContain('download your signed NDA');
  });

  it('defaults to the NDA-signed copy when ndaBypassed is omitted', () => {
    const html = renderToStaticMarkup(AccessGrantedEmail({ ...baseProps }));

    expect(html).toContain('Your NDA has been signed');
  });
});
