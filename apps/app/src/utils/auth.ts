import { betterAuth } from "better-auth";
import { db } from "@comp/db";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { emailOTP, organization } from "better-auth/plugins";
import { ac, owner, admin, auditor, member, employee } from "./permissions";
import { sendInviteMemberEmail } from "@comp/email/lib/invite-member";
import { sendEmail } from "@comp/email/lib/resend";
import { nextCookies } from "better-auth/next-js";
import { OTPVerificationEmail } from "@comp/email";

export const auth = betterAuth({
	database: prismaAdapter(db, {
		provider: "postgresql",
	}),
	advanced: {
		// This will enable us to fall back to DB for ID generation.
		// It's important so we can use customs ID's specified in Prisma Schema.
		generateId: false,
	},
	secret: process.env.AUTH_SECRET!,
	plugins: [
		organization({
			async sendInvitationEmail(data) {
				const isLocalhost = process.env.NODE_ENV === "development";
				const protocol = isLocalhost ? "http" : "https";
				const domain = isLocalhost ? "localhost:3000" : "app.trycomp.ai";
				const inviteLink = `${protocol}://${domain}/auth?inviteCode=${data.invitation.id}`;

				await sendInviteMemberEmail({
					email: data.email,
					inviteLink,
					organizationName: data.organization.name,
				});
			},
			ac,
			roles: {
				owner,
				admin,
				auditor,
				employee,
			},
			schema: {
				organization: {
					modelName: "Organization",
				},
			},
		}),
		emailOTP({
			otpLength: 6,
			expiresIn: 10 * 60,
			async sendVerificationOTP({ email, otp }) {
				await sendEmail({
					to: email,
					subject: "One-Time Password for Comp AI",
					react: OTPVerificationEmail({ email, otp }),
				});
			},
		}),
		nextCookies(),
	],
	socialProviders: {
		google: {
			clientId: process.env.AUTH_GOOGLE_ID!,
			clientSecret: process.env.AUTH_GOOGLE_SECRET!,
		},
		github: {
			clientId: process.env.AUTH_GITHUB_ID!,
			clientSecret: process.env.AUTH_GITHUB_SECRET!,
		},
	},
	user: {
		modelName: "User",
	},
	organization: {
		modelName: "Organization",
	},
	member: {
		modelName: "Member",
	},
	invitation: {
		modelName: "Invitation",
	},
	session: {
		modelName: "Session",
	},
	account: {
		modelName: "Account",
	},
	verification: {
		modelName: "Verification",
	},
});

export type Session = typeof auth.$Infer.Session;
export type ActiveOrganization = typeof auth.$Infer.ActiveOrganization;
export type Member = typeof auth.$Infer.Member;
export type Organization = typeof auth.$Infer.Organization;
export type Invitation = typeof auth.$Infer.Invitation;
export type Role = typeof auth.$Infer.Member.role;
