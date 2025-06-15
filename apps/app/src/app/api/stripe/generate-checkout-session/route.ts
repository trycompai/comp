import { stripe } from "@/actions/organization/lib/stripe";
import { getServersideSession } from "@/lib/get-session";
import { auth } from "@/utils/auth";
import { client } from "@comp/kv";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { user, session } = await getServersideSession(req);

  // Need to get the organization and verify that the user is a member of the organization.

  // Get the stripeCustomerId from your KV store
  let stripeCustomerId = await client.get(`stripe:user:${user.id}`);

  // Create a new Stripe customer if this user doesn't have one
  if (!stripeCustomerId) {
    const newCustomer = await stripe.customers.create({
      email: user.email,
      metadata: {
        userId: user.id, // DO NOT FORGET THIS
      },
    });

    // Store the relation between userId and stripeCustomerId in your KV
    await client.set(`stripe:user:${user.id}`, newCustomer.id);
    stripeCustomerId = newCustomer.id;
  }

  // ALWAYS create a checkout with a stripeCustomerId. They should enforce this.
  const checkout = await stripe.checkout.sessions.create({
    customer: stripeCustomerId as string,
    success_url: "https://t3.chat/success",
    // Add additional checkout session parameters here
  });

  return NextResponse.json(checkout);
}

//https://github.com/t3dotgg/stripe-recommendations
