import { cn } from '@/lib/utils';
import CustomerLogo1 from './customer-logo-1';
import CustomerLogo3 from './customer-logo-3';
import CustomerLogo4 from './customer-logo-4';
import CustomerLogo5 from './customer-logo-5';
import CustomerLogo6 from './customer-logo-6';
import CustomerLogo7 from './customer-logo-7';
import CustomerLogo8 from './customer-logo-8';
import { Marquee } from './marquee';

export default function LogoMarquee({ className }: { className?: string }) {
  return (
    <section
      className={cn('relative justify-center items-center grid max-w-4xl mx-auto', className)}
    >
      <Marquee
        className="flex w-full items-center justify-center gap-6"
        reverse={false}
        pauseOnHover={true}
        vertical={false}
        repeat={12}
      >
        <div className="flex items-center justify-center px-4">
          <CustomerLogo1 />
        </div>
        <div className="flex items-center justify-center px-4">
          <CustomerLogo3 />
        </div>
        <div className="flex items-center justify-center px-4">
          <CustomerLogo4 />
        </div>
        <div className="flex items-center justify-center px-4">
          <CustomerLogo5 />
        </div>
        <div className="flex items-center justify-center px-4">
          <CustomerLogo6 />
        </div>
        <div className="flex items-center justify-center px-4">
          <CustomerLogo7 />
        </div>
        <div className="flex items-center justify-center px-4">
          <CustomerLogo8 />
        </div>
      </Marquee>
    </section>
  );
}
