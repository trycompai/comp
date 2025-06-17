import { Button, Section } from '@react-email/components';

export function GetStarted() {
  return (
    <Section className="mt-[50px] mb-[50px] text-center">
      <Button
        className="text-primary border border-solid border-[#121212] bg-transparent px-6 py-3 text-center text-[14px] font-medium text-[#121212] no-underline"
        href="https://trycomp.ai?utm_source=email&utm_medium=get-started-button"
      >
        Get started
      </Button>
    </Section>
  );
}
