import {
  Column,
  Hr,
  Img,
  Link,
  Row,
  Section,
  Text,
} from "@react-email/components";

export function Footer() {
  return (
    <Section className="w-full">
      <Hr />

      <br />

      <Text className="text-[21px] font-regular">Compliance made easy.</Text>

      <br />
      <br />

      <Row>
        <Text className="text-[#B8B8B8] text-xs">
          Comp AI, Inc. - 2261 Market Street, San Francisco, CA 94114
        </Text>
      </Row>

      <Row>
        <Link
          className="text-[#707070] text-[12px]"
          href="https://app.trycomp.ai/settings/notifications"
          title="Unsubscribe"
        >
          Notification preferences
        </Link>
      </Row>

      <br />
      <br />

      <Row>
        <Link href="https://app.trycomp.ai">
          <Img
            src={"https://trycomp.ai/logo.png"}
            width="32"
            height="32"
            alt="Comp AI"
            className="block"
          />
        </Link>
      </Row>
    </Section>
  );
}
