import { fetchStripePriceDetails } from '@/actions/stripe/fetch-price-details';
import { getSubscriptionData } from '@/app/api/stripe/getSubscriptionData';
import { auth } from '@/utils/auth';
import { db } from '@comp/db';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@comp/ui/accordion';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { PricingCards } from './pricing-cards';

interface PageProps {
  params: Promise<{
    orgId: string;
  }>;
}

const pricingFaqData = [
  {
    id: 'free-trial',
    question: 'Is there a free trial available?',
    answer:
      'Our Starter plan is completely free. For our Done For You plan, we offer competitive pricing without free trials since our services are already affordable.',
  },
  {
    id: 'how-it-works',
    question: 'How does the Done For You plan work?',
    answer:
      'Our team becomes your compliance team. We handle everything needed to make your company compliant within 14 days. We manage all the work through a private Slack channel that connects you directly with our team.',
  },
  {
    id: 'fast',
    question: 'How fast is it to get compliant with Comp AI?',
    answer: 'With our Done For You plan, we make you audit-ready in just 14 days.',
  },
  {
    id: 'audit',
    question: 'Is the audit included?',
    answer:
      "Yes, the third-party audit cost is included in our Done For You plan (for SOC 2, ISO 27001, and other frameworks). If you're on the Starter plan, you can buy a third-party audit through our app from trusted partners.",
  },
  {
    id: 'scaling-between-plans',
    question: 'Can I switch between plans (Starter, Done For You, Scale)?',
    answer:
      "Yes, you can upgrade from Starter to Done For You as your business grows. If your team exceeds 25 people while on the Done For You plan, we'll discuss your options after the first year.",
  },
  {
    id: 'trust-security-portal',
    question: "What is the 'Trust & Security Portal' and what does it offer?",
    answer:
      "The Trust & Security Portal is a simple way to show your customers that you're compliant and secure. You can see an example here: https://trust.inc/casperstudios",
  },
  {
    id: 'extras',
    question: 'Can we get more than one framework on the Done For You plan?',
    answer:
      'Yes, you can add multiple frameworks to your Done For You plan. After we implement your first framework, we can add more at a price that fits your budget.',
  },
];

export default async function UpgradePage({ params }: PageProps) {
  const { orgId } = await params;

  // Check auth
  const authSession = await auth.api.getSession({
    headers: await headers(),
  });

  if (!authSession?.user?.id) {
    redirect('/sign-in');
  }

  // Verify user has access to this org
  const member = await db.member.findFirst({
    where: {
      organizationId: orgId,
      userId: authSession.user.id,
    },
    include: {
      organization: {
        select: {
          name: true,
          stripeCustomerId: true,
        },
      },
    },
  });

  if (!member) {
    redirect('/');
  }

  // Check if they already have an active subscription (excluding self-serve)
  const subscription = await getSubscriptionData(orgId);
  if (subscription && (subscription.status === 'active' || subscription.status === 'trialing')) {
    // Already have a paid subscription, redirect to dashboard
    redirect(`/${orgId}`);
  }

  // Fetch price details from Stripe
  const priceDetails = await fetchStripePriceDetails();

  return (
    <div className="mx-auto px-4 py-8 max-w-7xl">
      <div className="relative">
        <div className="relative bg-transparent p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2">Choose Your Plan</h1>
            <p className="text-xl text-muted-foreground">
              Get compliant fast with our DIY or Done-For-You solutions
            </p>
          </div>
          <PricingCards organizationId={orgId} priceDetails={priceDetails} />

          {/* FAQ Section */}
          <div className="mt-16 max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-xl font-bold mb-2">Frequently Asked Questions</h2>
              <p className="text-sm text-muted-foreground">
                Everything you need to know about our pricing and plans
              </p>
            </div>

            <Accordion type="single" collapsible className="w-full">
              {pricingFaqData.map((faq) => (
                <AccordionItem key={faq.id} value={faq.id}>
                  <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </div>
    </div>
  );
}
