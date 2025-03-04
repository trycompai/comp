import Logo from "@/app/components/logo";
import { env } from "@/env.mjs";
import Link from "next/link";
import Balancer from "react-wrap-balancer";

export default function SuccessPage() {
  return (
    <>
      <section className="w- full">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="flex flex-col items-center space-y-6">
            <Logo />

            <h1 className="max-w-[900px] text-4xl font-semibold leading-tight tracking-tighter lg:leading-[1.1] mx-auto">
              <Balancer>Thank you 🎉</Balancer>
            </h1>

            <p className="text-center text-lg md:text-xl font-light text-muted-foreground mt-6 mx-auto max-w-[800px]">
              <Balancer>
                We'll be in touch when we're close to launching. In the
                meantime, join us on the community{" "}
                <Link
                  href="https://discord.gg/compai"
                  className="underline underline-offset-4"
                  target="_blank"
                >
                  Discord
                </Link>{" "}
                to learn more about the project and to get involved!
              </Balancer>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
