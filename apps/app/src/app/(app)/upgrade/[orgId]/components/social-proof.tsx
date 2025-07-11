import '../styles/marquee.css';
import LogoMarquee from './logos/logo-marquee';

export function SocialProof() {
  return (
    <div>
      <p className="text-center text-sm text-muted-foreground mb-6">
        Trusted by leading companies to achieve compliance
      </p>
      <LogoMarquee className="opacity-60 hover:opacity-100 transition-opacity duration-300" />
    </div>
  );
}
