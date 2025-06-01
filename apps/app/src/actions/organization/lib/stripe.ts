import { env } from "@/env.mjs";
import Stripe from "stripe";

export const stripeWebhookSecret = env.STRIPE_WEBHOOK_SECRET;

let stripe: Stripe | undefined;

if (env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET) {
	stripe = new Stripe(env.STRIPE_SECRET_KEY, {
		apiVersion: "2025-05-28.basil",
	});
}

export { stripe };
