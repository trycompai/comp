<!-- PROJECT LOGO -->
<p align="center">
  <a href="https://github.com/trycompai/comp">
   <img src="https://avatars.githubusercontent.com/u/184552964?s=200&v=4" alt="Logo">
  </a>

  <h3 align="center">Comp AI</h3>

  <p align="center">
    The open-source compliance platform.
    <br />
    <a href="https://trycomp.ai"><strong>Learn more »</strong></a>
    <br />
    <br />
    <a href="https://github.com/trycompai/comp/discussions">Discussions</a>
    ·
    <a href="https://trycomp.ai">Website</a>
    ·
    <a href="https://github.com/trycompai/comp/issues">Issues</a>
    ·
    <a href="#">Roadmap (coming soon)</a>
  </p>
</p>

## About

# Security and compliance, open.

We're building the first open source compliance automation platform that helps companies of any size work towards, manage and achieve compliance with common standards like SOC 2, ISO 27001 and GDPR.

We transform compliance from a vendor checkbox into an engineering problem solved through code. Our platform automates evidence collection, policy management, and control implementation while keeping you in control of your data and infrastructure.

### Built With

- [Next.js](https://nextjs.org/?ref=trycomp.ai)
- [Prisma.io](https://prisma.io/?ref=trycomp.ai)
- [Tailwind CSS](https://tailwindcss.com/?ref=trycomp.ai)
- [Neon](https://neon.tech/?ref=trycomp.ai)
- [Upstash](https://upstash.com/?ref=trycomp.ai)
- [Vercel](https://vercel.com/?ref=trycomp.ai)

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

1. Clone the repo into a public GitHub repository (or fork https://github.com/trycompai/comp/fork). If you plan to distribute the code, keep the source code public to comply with [AGPLv3](https://github.com/trycompai/comp/blob/main/LICENSE). To clone in a private repository, [acquire a commercial license](https://trycomp.ai)

   ```sh
   git clone https://github.com/trycompai/comp.git
   ```

2. Go to the project folder

   ```sh
   cd bubba
   ```

3. Install packages with bun

   ```sh
   bun i
   ```

4. Set up your `.env` file

   - Duplicate `.env.example` to `.env`
   - Use `openssl rand -base64 32` to generate a key and add it under `NEXTAUTH_SECRET` in the `.env` file.

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

6. Run the turbo dev command to start the development server

   ```sh
   turbo dev
   ```

## Deployment

### Docker

Steps to deploy Comp AI on Docker are coming soon.

### Vercel

Steps to deploy Comp AI on Vercel are coming soon.


## License

Comp AI, Inc. is a commercial open source company, which means some parts of this open source repository require a commercial license. The concept is called "Open Core" where the core technology (99%) is fully open source, licensed under [AGPLv3](https://opensource.org/license/agpl-v3) and the last 1% is covered under a commercial license (["/ee" Enterprise Edition"]).

> [!TIP]
> We work closely with the community and always invite feedback about what should be open and what is fine to be commercial. This list is not set and stone and we have moved things from commercial to open in the past. Please open a [discussion](https://github.com/trycompai/comp/discussions) if you feel like something is wrong.


### Contributors

<a href="https://github.com/trycompai/comp/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=trycomp/comp" />
</a>

<!-- LICENSE -->

## License

Distributed under the [AGPLv3 License](https://github.com/trycompai/comp/blob/main/LICENSE). See `LICENSE` for more information.
# comp