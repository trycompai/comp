import "./src/env.mjs";

const config = {
	poweredByHeader: false,
	reactStrictMode: true,
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "**",
			},
		],
	},
	transpilePackages: ["@bubba/ui", "@bubba/data"],
	logging: {
		fetches: {
			fullUrl: process.env.LOG_FETCHES === "true",
		},
	},
	experimental: {
		authInterrupts: true,
	},
	async rewrites() {
		return [
			{
				source: "/ingest/static/:path*",
				destination: "https://us-assets.i.posthog.com/static/:path*",
			},
			{
				source: "/ingest/:path*",
				destination: "https://us.i.posthog.com/:path*",
			},
			{
				source: "/ingest/decide",
				destination: "https://us.i.posthog.com/decide",
			},
		];
	},
	skipTrailingSlashRedirect: true,
};

export default config;
