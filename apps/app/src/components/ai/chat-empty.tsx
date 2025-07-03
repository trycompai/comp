import { LogoSpinner } from '../logo-spinner';

type Props = {
  firstName: string;
};

export function ChatEmpty({ firstName }: Props) {
  return (
    <div className="todesktop:mt-24 mt-[200px] flex w-full flex-col items-center justify-center text-center md:mt-24">
      <LogoSpinner />
      <span className="mt-6 text-xl font-medium">
        Hi {firstName}, how can I help <br />
        you today?
      </span>
    </div>
  );
}
