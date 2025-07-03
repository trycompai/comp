import { LogoSpinner } from '@/components/logo-spinner';

const Loader = () => {
  return (
    <div className="bg-card/80 border-border flex h-full w-full items-center justify-center rounded-sm border py-24 backdrop-blur-sm">
      <div>
        <LogoSpinner />
      </div>
    </div>
  );
};

export default Loader;
