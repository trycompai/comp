import { VendorStatus, VendorCategory, VendorTaskStatus } from "@bubba/db/types";
import { z } from "zod";

export const createVendorTaskCommentSchema = z.object({
	vendorId: z.string().min(1, {
		message: "Vendor ID is required",
	}),
	vendorTaskId: z.string().min(1, {
		message: "Task ID is required",
	}),
	content: z.string().min(1, {
		message: "Task content is required",
	}),
});

export const createVendorTaskSchema = z.object({
	vendorId: z.string().min(1, {
		message: "Vendor ID is required",
	}),
	title: z.string().min(1, {
		message: "Title is required", 
	}),
	description: z.string().min(1, {
		message: "Description is required",
	}),
	dueDate: z.date({
		required_error: "Due date is required",
	}),
	ownerId: z.string().optional(),
});

export const vendorContactSchema = z.object({
	name: z.string().min(1, "Name is required"),
	email: z.string().email("Invalid email address"),
	role: z.string().min(1, "Role is required"),
});

export const createVendorSchema = z.object({
	name: z.string().min(1, "Name is required"),
	website: z.string().url("Must be a valid URL"),
	description: z.string().min(1, "Description is required"),
	category: z.nativeEnum(VendorCategory),
	ownerId: z.string().optional(),
	contacts: z
		.array(vendorContactSchema)
		.min(1, "At least one contact is required"),
});

export const updateVendorSchema = z.object({
	id: z.string(),
	name: z.string().min(1, "Name is required"),
	description: z.string().min(1, "Description is required"),
	category: z.nativeEnum(VendorCategory),
	status: z.nativeEnum(VendorStatus),
	ownerId: z.string().optional(),
});

export const createVendorCommentSchema = z.object({
	vendorId: z.string(),
	content: z.string().min(1),
});

export const updateVendorRiskSchema = z.object({
	id: z.string(),
	inherent_risk: z.enum(["low", "medium", "high", "unknown"]).optional(),
	residual_risk: z.enum(["low", "medium", "high", "unknown"]).optional(),
});

export const updateVendorTaskSchema = z.object({
	id: z.string().min(1, {
		message: "Task ID is required",
	}),
	title: z.string().min(1, {
		message: "Title is required",
	}),
	description: z.string().min(1, {
		message: "Description is required",
	}),
	dueDate: z.date().optional(),
	status: z.nativeEnum(VendorTaskStatus, {
		required_error: "Task status is required",
	}),
	ownerId: z.string().optional(),
});