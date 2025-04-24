<!-- PROJECT LOGO -->
<p align="center">
  <a href="https://github.com/trycompai/comp">
   <img src="https://trycomp.ai/logo.png" alt="Logo">
  </a>

  <h3 align="center">Comp AI</h3>

  <p align="center">
    The open-source compliance platform.
    <br />
    <a href="https://trycomp.ai"><strong>Learn more »</strong></a>
    <br />
    <br />
    <a href="https://discord.gg/compai">Discord</a>
    ·
    <a href="https://trycomp.ai">Website</a>
    ·
    <a href="https://trycomp.ai/docs">Documentation</a>
    ·
    <a href="https://github.com/trycompai/comp/issues">Issues</a>
    ·
    <a href="https://github.com/orgs/trycompai/projects/1">Roadmap</a>
  </p>
</p>

## About

# Security and compliance, open.

We're building the first open source compliance automation platform that helps companies of any size work towards, manage and achieve compliance with common standards like SOC 2, ISO 27001 and GDPR.

We transform compliance from a vendor checkbox into an engineering problem solved through code. Our platform automates evidence collection, policy management, and control implementation while keeping you in control of your data and infrastructure.

## Recognition

#### [ProductHunt](https://www.producthunt.com/posts/comp-ai)

<a href="https://www.producthunt.com/posts/comp-ai?embed=true&utm_source=badge-top-post-badge&utm_medium=badge&utm_souce=badge-comp&#0045;ai" target="_blank"><img src="https://api.producthunt.com/widgets/embed-image/v1/top-post-badge.svg?post_id=944698&theme=light&period=daily&t=1745500415958" alt="Comp&#0032;AI - The&#0032;open&#0032;source&#0032;Vanta&#0032;&#0038;&#0032;Drata&#0032;alternative | Product Hunt" style="width: 250px; height: 54px;" width="250" height="54" /></a>

### Built With

- [Next.js](https://nextjs.org/?ref=trycomp.ai)
- [Trigger.dev](https://trigger.dev/?ref=trycomp.ai)
- [Prisma](https://prisma.io/?ref=trycomp.ai)
- [Tailwind CSS](https://tailwindcss.com/?ref=trycomp.ai)
- [Upstash](https://upstash.com/?ref=trycomp.ai)
- [Vercel](https://vercel.com/?ref=trycomp.ai)
- [Novu](https://novu.co/?ref=trycomp.ai)

## Contact us

Contact our founders at hello@trycomp.ai to learn more about how we can help you achieve compliance.

## Stay Up-to-Date

Join our [waitlist](https://trycomp.ai) to get early access to the cloud hosted version of Comp AI.

## Getting Started

To get a local copy up and running, please follow these simple steps.

### Prerequisites

Here is what you need to be able to run Comp AI.

- Node.js (Version: >=20.x)
- Bun (Version: >=1.1.36)
- Postgres (Version: >=15.x)

## Development

### Setup

1. Clone the repo into a public GitHub repository (or fork https://github.com/trycompai/comp/fork). If you modify and distribute the code, or run it as a network service, you must provide the source code to users under the terms of AGPLv3. For uses not covered by AGPLv3, a commercial license is available.

   ```sh
   git clone https://github.com/trycompai/comp.git
   ```

2. Go to the project folder

   ```sh
   cd comp
   ```

3. Install packages with bun

   ```sh
   bun i
   ```

4. Set up your `.env` files
   - Copy the example environment files to create your local environment files:
   ```sh
   cp apps/app/.env.example apps/app/.env
   cp apps/portal/.env.example apps/portal/.env
   ```
   - Fill in the required environment variables in both `.env` files
   - Use `openssl rand -base64 32` to generate a key and add it under `AUTH_SECRET` in the `apps/app/.env` file

5. Setup Node
   If your Node version does not meet the project's requirements as instructed by the docs, "nvm" (Node Version Manager) allows using Node at the version required by the project:

   ```sh
   nvm use
   ```

   You first might need to install the specific version and then use it:

   ```sh
   nvm install && nvm use
   ```

   You can install nvm from [here](https://github.com/nvm-sh/nvm).

6. Setup Database
   Start the Postgres database using Docker:

   ```sh
   bun docker:up
   ```

   Then set up the database schema and seed data:

   ```sh
   # Generate Prisma client
   bun db:generate

   # Push the schema to the database
   bun db:push

   # Optional: Seed the database with initial data
   bun db:seed
   ```

   Other useful database commands:
   ```sh
   # Open Prisma Studio to view/edit data
   bun db:studio

   # Run database migrations
   bun db:migrate

   # Stop the database container
   bun docker:down

   # Remove the database container and volume
   bun docker:clean
   ```

7. Run the turbo dev command to start the development server

   ```sh
   turbo dev
   ```

## Deployment

### Docker

Steps to deploy Comp AI on Docker are coming soon.

### Vercel

Steps to deploy Comp AI on Vercel are coming soon.

## Contributors

<a href="https://github.com/trycompai/comp/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=trycompai/comp" />
</a>

## Repo Activity

![Alt](https://repobeats.axiom.co/api/embed/1371c2fe20e274ff1e0e8d4ca225455dea609cb9.svg "Repobeats analytics image")

<!-- LICENSE -->

## License

Comp AI, Inc. is a commercial open source company, which means some parts of this open source repository require a commercial license. The concept is called "Open Core" where the core technology (99%) is fully open source, licensed under [AGPLv3](https://opensource.org/license/agpl-v3) and the last 1% is covered under a commercial license (["/ee" Enterprise Edition"]).

> [!TIP]
> We work closely with the community and always invite feedback about what should be open and what is fine to be commercial. This list is not set and stone and we have moved things from commercial to open in the past. Please open a [discussion](https://github.com/trycompai/comp/discussions) if you feel like something is wrong.