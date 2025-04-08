"use client";

import { useEmployees } from "@/app/[locale]/(app)/(dashboard)/[orgId]/employees/all/hooks/useEmployees";
import { useI18n } from "@/locales/client";
import { Button } from "@comp/ui/button";
import { Input } from "@comp/ui/input";
import { Label } from "@comp/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@comp/ui/select";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@comp/ui/sheet";
import type { Departments } from "@prisma/client";
import { useQueryState } from "nuqs";
import { useState } from "react";
import { toast } from "sonner";
import { useMediaQuery } from "../../../../../packages/ui/src/hooks/use-media-query";
import { Drawer, DrawerContent, DrawerTitle } from "@comp/ui/drawer";

const DEPARTMENTS: Departments[] = [
	"none",
	"admin",
	"gov",
	"hr",
	"it",
	"itsm",
	"qms",
];

export function EmployeeInviteSheet() {
	const t = useI18n();
	const [open, setOpen] = useQueryState("invite-user-sheet");
	const isDesktop = useMediaQuery("(min-width: 768px)");

	const [email, setEmail] = useState("");
	const [department, setDepartment] = useState<Departments>("none");
	const [name, setName] = useState("");
	const { addEmployee, isMutating } = useEmployees({
		search: "",
		role: "",
		page: 1,
		per_page: 10,
	});

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		try {
			const result = await addEmployee({
				name,
				email: email.trim(),
				department,
			});

			toast.success(t("people.invite.success"));
			setOpen(null);
		} catch (error) {
			toast.error(t("errors.unexpected"));
		}
	};

	if (isDesktop) {
		return (
			<Sheet
				open={open === "true"}
				onOpenChange={(open) => setOpen(open ? "true" : null)}
			>
				<SheetContent>
					<form onSubmit={handleSubmit}>
						<SheetHeader>
							<SheetTitle>{t("people.invite.title")}</SheetTitle>
							<SheetDescription>
								{t("people.invite.description")}
							</SheetDescription>
						</SheetHeader>

						<div className="grid gap-4 py-4">
							<div className="grid gap-2">
								<Label htmlFor="name">{t("people.invite.name.label")}</Label>
								<Input
									id="name"
									placeholder={t("people.invite.name.placeholder")}
									value={name}
									onChange={(e) => setName(e.target.value)}
									required
								/>
							</div>

							<div className="grid gap-2">
								<Label htmlFor="email">{t("people.invite.email.label")}</Label>
								<Input
									id="email"
									type="email"
									placeholder={t("people.invite.email.placeholder")}
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									required
								/>
							</div>

							<div className="grid gap-2">
								<Label htmlFor="department">
									{t("people.invite.department.label")}
								</Label>
								<Select
									value={department}
									onValueChange={(value) => setDepartment(value as Departments)}
								>
									<SelectTrigger id="department">
										<SelectValue
											placeholder={t("people.invite.department.placeholder")}
										/>
									</SelectTrigger>
									<SelectContent>
										{DEPARTMENTS.map((dept) => (
											<SelectItem key={dept} value={dept}>
												{dept.toUpperCase()}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>

						<SheetFooter>
							<Button
								type="submit"
								disabled={isMutating || !email.trim()}
								isLoading={isMutating}
							>
								{isMutating
									? t("people.invite.submit")
									: t("people.invite.submit")}
							</Button>
						</SheetFooter>
					</form>
				</SheetContent>
			</Sheet>
		);
	}

	return (
		<Drawer
			open={open === "true"}
			onOpenChange={(open) => setOpen(open ? "true" : null)}
		>
			<DrawerTitle hidden>{t("policies.create_new")}</DrawerTitle>
			<DrawerContent className="p-6">
				<form onSubmit={handleSubmit}>
					<SheetHeader>
						<SheetTitle>{t("people.invite.title")}</SheetTitle>
						<SheetDescription>
							{t("people.invite.description")}
						</SheetDescription>
					</SheetHeader>

					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="name">{t("people.invite.name.label")}</Label>
							<Input
								id="name"
								placeholder={t("people.invite.name.placeholder")}
								value={name}
								onChange={(e) => setName(e.target.value)}
								required
							/>
						</div>

						<div className="grid gap-2">
							<Label htmlFor="email">{t("people.invite.email.label")}</Label>
							<Input
								id="email"
								type="email"
								placeholder={t("people.invite.email.placeholder")}
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								required
							/>
						</div>

						<div className="grid gap-2">
							<Label htmlFor="department">
								{t("people.invite.department.label")}
							</Label>
							<Select
								value={department}
								onValueChange={(value) => setDepartment(value as Departments)}
							>
								<SelectTrigger id="department">
									<SelectValue
										placeholder={t("people.invite.department.placeholder")}
									/>
								</SelectTrigger>
								<SelectContent>
									{DEPARTMENTS.map((dept) => (
										<SelectItem key={dept} value={dept}>
											{dept.toUpperCase()}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>

					<SheetFooter>
						<Button
							type="submit"
							disabled={isMutating || !email.trim()}
							isLoading={isMutating}
						>
							{isMutating
								? t("people.invite.submit")
								: t("people.invite.submit")}
						</Button>
					</SheetFooter>
				</form>
			</DrawerContent>
		</Drawer>
	);
}
