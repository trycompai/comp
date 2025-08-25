import { Img, Section } from '@react-email/components';

export function Logo() {
  return (
    <Section className="mt-[32px]">
      <Img
        src={'https://assets.trycomp.ai/logo.png'}
        width="45"
        height="45"
        alt="Comp AI"
        className="mx-auto my-0 block"
      />
    </Section>
  );
}
