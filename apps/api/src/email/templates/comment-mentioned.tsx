import * as React from 'react';
import {
  Body,
  Button,
  Container,
  Font,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from '@react-email/components';
import { Footer } from '../components/footer';
import { Logo } from '../components/logo';
import { getUnsubscribeUrl } from '@comp/email';

interface Props {
  toName: string;
  toEmail: string;
  commentContent: string;
  mentionedByName: string;
  entityName: string;
  entityRoutePath: string;
  entityId: string;
  organizationId: string;
  commentUrl: string;
}

export const CommentMentionedEmail = ({
  toName,
  toEmail,
  commentContent,
  mentionedByName,
  entityName,
  entityRoutePath,
  entityId,
  organizationId,
  commentUrl,
}: Props) => {
  const unsubscribeUrl = getUnsubscribeUrl(toEmail);
  
  // Extract plain text from TipTap JSON if needed
  const getPlainText = (content: string): string => {
    try {
      const parsed = JSON.parse(content);
      if (parsed && parsed.type === 'doc' && parsed.content) {
        // Extract text from TipTap JSON
        const extractText = (node: any): string => {
          if (node.type === 'text') return node.text || '';
          if (node.type === 'mention') return `@${node.attrs?.label || node.attrs?.id || ''}`;
          if (node.content && Array.isArray(node.content)) {
            return node.content.map(extractText).join('');
          }
          return '';
        };
        return parsed.content.map(extractText).join(' ').trim();
      }
    } catch {
      // Not JSON, return as-is
    }
    return content;
  };

  const plainTextContent = getPlainText(commentContent);
  const previewText = plainTextContent.length > 100 
    ? plainTextContent.substring(0, 100) + '...' 
    : plainTextContent;

  return (
    <Html>
      <Tailwind>
        <head>
          <Font
            fontFamily="Geist"
            fallbackFontFamily="Helvetica"
            fontWeight={400}
            fontStyle="normal"
          />
          <Font
            fontFamily="Geist"
            fallbackFontFamily="Helvetica"
            fontWeight={500}
            fontStyle="normal"
          />
        </head>
        <Preview>{mentionedByName} mentioned you in a comment</Preview>

        <Body className="mx-auto my-auto bg-[#fff] font-sans">
          <Container
            className="mx-auto my-[40px] max-w-[600px] border-transparent p-[20px] md:border-[#E8E7E1]"
            style={{ borderStyle: 'solid', borderWidth: 1 }}
          >
            <Logo />
            <Heading className="mx-0 my-[30px] p-0 text-center text-[24px] font-normal text-[#121212]">
              You were mentioned in a comment
            </Heading>

            <Text className="text-[14px] leading-[24px] text-[#121212]">
              Hello {toName},
            </Text>

            <Text className="text-[14px] leading-[24px] text-[#121212]">
              <strong>{mentionedByName}</strong> mentioned you in a comment on{' '}
              <strong>{entityName}</strong>.
            </Text>

            <Section className="mt-[24px] mb-[24px] rounded-[4px] bg-[#F5F5F5] p-[16px]">
              <Text className="text-[14px] leading-[20px] text-[#121212] italic">
                "{previewText}"
              </Text>
            </Section>

            <Section className="mt-[32px] mb-[32px] text-center">
              <Button
                className="rounded-[3px] bg-[#121212] px-[20px] py-[12px] text-center text-[14px] font-semibold text-white no-underline"
                href={commentUrl}
              >
                View Comment
              </Button>
            </Section>

            <Text className="text-[14px] leading-[24px] text-[#121212]">
              or copy and paste this URL into your browser:{' '}
              <a href={commentUrl} className="text-[#121212] underline">
                {commentUrl}
              </a>
            </Text>

            <Section className="mt-[30px] mb-[20px]">
              <Text className="text-[12px] leading-[20px] text-[#666666]">
                Don't want to receive comment mention notifications?{' '}
                <Link href={unsubscribeUrl} className="text-[#121212] underline">
                  Manage your email preferences
                </Link>
                .
              </Text>
            </Section>

            <br />

            <Footer />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default CommentMentionedEmail;

