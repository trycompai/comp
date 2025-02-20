import { Hr, Link, Section, Text } from "@react-email/components";

export function Footer() {
  return (
    <Section className="w-full">
      <Hr />

      <Text className="text-[14px] font-regular">
        Open Source Compliance,{" "}
        <Link href="https://trycomp.ai?utm_source=email&utm_medium=footer">
          Comp AI
        </Link>
        .
      </Text>

      <Text className="text-[#B8B8B8] text-xs">
        Bubba AI, Inc. 2261 Market Street, San Francisco, CA 94114
      </Text>
    </Section>
  );
}
