import { z } from 'zod';

export const faqItemSchema = z.object({
  id: z.string(),
  question: z.string().min(1, 'Question is required').max(500, 'Question too long'),
  answer: z.string().min(1, 'Answer is required').max(5000, 'Answer too long'),
  order: z.number().int().min(0),
});

export type FaqItem = z.infer<typeof faqItemSchema>;

export const faqArraySchema = z.array(faqItemSchema).max(50, 'Maximum 50 FAQs allowed');

