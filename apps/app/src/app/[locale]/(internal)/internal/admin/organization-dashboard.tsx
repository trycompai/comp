"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { authClient } from "@/utils/auth-client";
import type { Member, Organization, User } from "@comp/db/types";
import {
	fetchOrganizations,
	addMemberToOrg,
	fetchAdminUsers,
	removeMember,
} from "./actions";
import { OrganizationList } from "./organization-list";
import { MembersModal } from "./members-modal";
import { Input } from "@comp/ui/input";
import { Search } from "lucide-react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@comp/ui/select";
import { Skeleton } from "@comp/ui/skeleton";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@comp/ui/card";

// Define the specific types returned by our actions
interface OrganizationWithMembers extends Organization {
	members: (Member & { user: User })[];
}

// Update props to accept individual ID and email
interface OrganizationDashboardProps {
	loggedInUserId: string;
	loggedInUserEmail: string;
}

export function OrganizationDashboard({
	loggedInUserId,
	loggedInUserEmail,
}: OrganizationDashboardProps) {
	// --- State Management ---

	// Organization Data & Filtering
	const [organizations, setOrganizations] = useState<
		OrganizationWithMembers[]
	>([]);
	const [searchQuery, setSearchQuery] = useState("");
	const [filteredOrganizations, setFilteredOrganizations] = useState<
		OrganizationWithMembers[]
	>([]);
	const [isFetchingOrgs, setIsFetchingOrgs] = useState(true);
	const [fetchOrgsError, setFetchOrgsError] = useState<string | null>(null);

	// Admin User Context
	const [adminUsers, setAdminUsers] = useState<User[]>([]);
	const [actingAsUser, setActingAsUser] = useState<User | null>(null); // Current user context
	const [isFetchingAdmins, setIsFetchingAdmins] = useState(true);

	// Member Actions (Add/Remove Self)
	const [isAddingMember, setIsAddingMember] = useState(false);
	const [addMemberError, setAddMemberError] = useState<string | null>(null);
	const [isRemovingMember, setIsRemovingMember] = useState(false);
	const [removeMemberError, setRemoveMemberError] = useState<string | null>(
		null,
	);

	// Modal State
	const [selectedOrg, setSelectedOrg] =
		useState<OrganizationWithMembers | null>(null); // Org selected for modal view
	const [isModalOpen, setIsModalOpen] = useState(false);

	// --- Data Fetching Functions ---

	/**
	 * Fetches all organizations and their members.
	 * Applies the current search filter after fetching.
	 */
	const loadOrganizations = useCallback(async () => {
		setIsFetchingOrgs(true);
		setFetchOrgsError(null);
		try {
			const result = await fetchOrganizations();
			if (result.success && result.data) {
				setOrganizations(result.data);
				// Apply current search query immediately after fetching
				if (searchQuery.trim() === "") {
					setFilteredOrganizations(result.data);
				} else {
					// Re-apply filter logic (extracted for reuse)
					filterOrgs(searchQuery, result.data);
				}
			} else {
				const errorMsg =
					result.error || "Failed to fetch organizations.";
				setFetchOrgsError(errorMsg);
				toast.error(errorMsg);
				setOrganizations([]); // Clear lists on error
				setFilteredOrganizations([]);
			}
		} catch (error) {
			console.error("Fetch orgs error:", error);
			const errorMsg =
				"An unexpected error occurred while fetching organizations.";
			setFetchOrgsError(errorMsg);
			toast.error(errorMsg);
			setOrganizations([]);
			setFilteredOrganizations([]);
		} finally {
			setIsFetchingOrgs(false);
		}
	}, [searchQuery]); // Add searchQuery dependency

	/**
	 * Fetches the list of admin users for the 'Acting As' dropdown.
	 * Sets the initial 'Acting As' user based on loggedInUserId.
	 * Handles cases where the logged-in user might not be in the fetched list.
	 */
	const loadAdminUsers = useCallback(async () => {
		setIsFetchingAdmins(true);
		try {
			const result = await fetchAdminUsers();
			if (result.success && result.data) {
				const fetchedAdmins = result.data;
				setAdminUsers(fetchedAdmins);
				// Find the full user object corresponding to the logged-in user
				const currentLoggedInUser = fetchedAdmins.find(
					(u) => u.id === loggedInUserId,
				);
				if (currentLoggedInUser) {
					setActingAsUser(currentLoggedInUser); // Set the full user object
				} else {
					// Logged-in user not found in admin list (might indicate an issue)
					console.warn(
						"Logged-in admin user info not found in fetched admin list.",
					);
					// Add a minimal representation for the dropdown if not already present
					if (!fetchedAdmins.some((u) => u.id === loggedInUserId)) {
						const minimalLoggedInUserRep: User = {
							id: loggedInUserId,
							email: loggedInUserEmail,
							name: "You (Not Found)", // Indicate issue
							// Add other required fields with defaults
							emailVerified: false,
							createdAt: new Date(),
							updatedAt: new Date(),
							image: null,
							lastLogin: null,
							rut: null,
						};
						setAdminUsers((prev) => [
							minimalLoggedInUserRep,
							...prev,
						]);
					}
					// Keep actingAsUser null until a valid selection is made
					setActingAsUser(null);
				}
			} else {
				toast.error(result.error || "Failed to fetch admin users.");
				// Add minimal representation for dropdown fallback
				const minimalLoggedInUserRep: User = {
					id: loggedInUserId,
					email: loggedInUserEmail,
					name: "You (Error)",
					emailVerified: false,
					createdAt: new Date(),
					updatedAt: new Date(),
					image: null,
					lastLogin: null,
					rut: null,
				};
				setAdminUsers([minimalLoggedInUserRep]);
				setActingAsUser(null); // Set to null on error
			}
		} catch (error) {
			console.error("Fetch admin users error:", error);
			toast.error(
				"An unexpected error occurred while fetching admin users.",
			);
			// Add minimal representation for dropdown fallback
			const minimalLoggedInUserRep: User = {
				id: loggedInUserId,
				email: loggedInUserEmail,
				name: "You (Error)",
				emailVerified: false,
				createdAt: new Date(),
				updatedAt: new Date(),
				image: null,
				lastLogin: null,
				rut: null,
			};
			setAdminUsers([minimalLoggedInUserRep]);
			setActingAsUser(null); // Set to null on error
		} finally {
			setIsFetchingAdmins(false);
		}
	}, [loggedInUserId, loggedInUserEmail]); // Use ID and Email props as deps

	// --- Filtering Logic ---

	/**
	 * Filters the base list of organizations based on the search query.
	 * Updates the `filteredOrganizations` state.
	 */
	const filterOrgs = useCallback(
		(query: string, baseOrgs: OrganizationWithMembers[]) => {
			const lowerQuery = query.toLowerCase();
			const filtered = baseOrgs.filter((org) => {
				// Check org name, slug, id
				if (
					org.name.toLowerCase().includes(lowerQuery) ||
					org.slug.toLowerCase().includes(lowerQuery) ||
					org.id.toLowerCase().includes(lowerQuery)
				) {
					return true;
				}
				// Check member name, email, id
				return org.members.some(
					(member) =>
						member.user.name?.toLowerCase().includes(lowerQuery) ||
						member.user.email.toLowerCase().includes(lowerQuery) ||
						member.id.toLowerCase().includes(lowerQuery),
				);
			});
			setFilteredOrganizations(filtered);
		},
		[], // No dependencies needed as it only uses arguments
	);

	// Update filtered orgs whenever the base organizations or search query changes
	useEffect(() => {
		filterOrgs(searchQuery, organizations);
	}, [searchQuery, organizations, filterOrgs]);

	// --- Event Handlers ---

	/**
	 * Handles changes in the search input field.
	 */
	const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		setSearchQuery(event.target.value);
	};

	/**
	 * Handles selection changes in the 'Acting As' dropdown.
	 */
	const handleActingUserChange = (userId: string) => {
		const selectedUser = adminUsers.find((u) => u.id === userId);
		setActingAsUser(selectedUser || null); // Set to null if user not found (shouldn't happen)
	};

	/**
	 * Handles adding the 'Acting As' user to the specified organization.
	 */
	const handleAddMember = useCallback(
		async (organizationId: string) => {
			if (!actingAsUser) {
				toast.error("No acting user selected.");
				return;
			}

			setIsAddingMember(true);
			setAddMemberError(null);
			try {
				const result = await addMemberToOrg({
					organizationId,
					targetUserId: actingAsUser.id,
				});

				if (result.success) {
					toast.success(
						`Successfully added ${actingAsUser.email} to organization.`,
					);
					// Refresh the organizations list to show the new member status
					await loadOrganizations();
				} else {
					const errorMsg = result.error || "Failed to add member.";
					setAddMemberError(errorMsg);
					toast.error(errorMsg);
				}
			} catch (error) {
				console.error("Add member error:", error);
				const errorMsg =
					"An unexpected error occurred while adding the member.";
				setAddMemberError(errorMsg);
				toast.error(errorMsg);
			} finally {
				setIsAddingMember(false);
			}
		},
		[actingAsUser, loadOrganizations],
	);

	/**
	 * Handles removing the 'Acting As' user from the specified organization.
	 */
	const handleRemoveMember = useCallback(
		async (organizationId: string) => {
			if (!actingAsUser) {
				toast.error("No acting user selected.");
				return;
			}

			// Check if trying to remove self (logged-in user)
			if (actingAsUser.id === loggedInUserId) {
				toast.error(
					"Cannot remove yourself using 'Act As'. Use organization settings.",
				);
				return;
			}

			setIsRemovingMember(true);
			setRemoveMemberError(null);
			try {
				const result = await removeMember({
					targetUserId: actingAsUser.id,
					organizationId: organizationId,
				});

				if (result.success) {
					toast.success(
						`Successfully removed ${actingAsUser.email} from organization.`,
					);
					// Refresh the organizations list to show the updated member status
					await loadOrganizations();
				} else {
					const errorMsg = result.error || "Failed to remove member.";
					setRemoveMemberError(errorMsg);
					toast.error(errorMsg);
				}
			} catch (error) {
				console.error("Remove member error:", error);
				const errorMsg =
					"An unexpected error occurred while removing the member.";
				setRemoveMemberError(errorMsg);
				toast.error(errorMsg);
			} finally {
				setIsRemovingMember(false);
			}
		},
		[actingAsUser, organizations, loadOrganizations],
	);

	/**
	 * Handles opening the members modal for the selected organization.
	 */
	const handleViewMembers = (organization: OrganizationWithMembers) => {
		setSelectedOrg(organization);
		setIsModalOpen(true);
	};

	// --- Initial Data Load Effect ---
	useEffect(() => {
		loadOrganizations();
		loadAdminUsers();
		// Run only on initial mount
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// --- Render ---
	return (
		<div className="space-y-6">
			{/* Controls Card */}
			<Card className="shadow-sm border border-border/40 rounded-xl overflow-hidden">
				<CardHeader className="pb-0">
					<CardTitle>Controls</CardTitle>
					<CardDescription>
						Filter organizations and select user context.
					</CardDescription>
				</CardHeader>
				<CardContent className="pt-6">
					<div className="flex flex-col md:flex-row gap-4 items-center justify-between">
						{/* Search Input with rounded corners */}
						<div className="relative flex-1 max-w-full md:max-w-[60%]">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
							<Input
								type="search"
								placeholder="Search organizations by name, slug, ID, or member..."
								value={searchQuery}
								onChange={handleSearchChange}
								className="pl-10 rounded-full border-border/40 focus-visible:ring-offset-2 w-full"
							/>
						</div>

						{/* Acting As Dropdown with rounded corners */}
						<div className="flex items-center gap-2 w-full md:w-auto">
							<span className="text-sm font-medium whitespace-nowrap">Acting As:</span>
							<div className="flex-1 min-w-[200px]">
								{isFetchingAdmins ? (
									<Skeleton className="h-9 w-full rounded-lg" />
								) : (
									<Select
										onValueChange={handleActingUserChange}
										// Use actingAsUser?.id to handle null case
										value={actingAsUser?.id ?? ""}
										disabled={adminUsers.length <= 1}
									>
										<SelectTrigger className="w-full rounded-lg border-border/40">
											<SelectValue placeholder="Select user to act as" />
										</SelectTrigger>
										<SelectContent className="rounded-lg">
											{adminUsers.map((user) => (
												<SelectItem
													key={user.id}
													value={user.id}
												>
													{/* Display name and email for clarity */}
													{user.name ?? "N/A"} ({user.email})
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								)}
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Loading State */}
			{isFetchingOrgs && (
				<Card className="shadow-sm border border-border/40 rounded-xl overflow-hidden">
					<CardHeader className="pb-0">
						<CardTitle>Organizations</CardTitle>
					</CardHeader>
					<CardContent className="pt-6">
						<div className="space-y-2">
							{Array.from({ length: 5 }).map((_, i) => (
								<Skeleton key={i} className="h-12 w-full rounded-lg" />
							))}
						</div>
					</CardContent>
				</Card>
			)}

			{/* Error State */}
			{fetchOrgsError && (
				<Card className="shadow-sm border-red-200 rounded-xl overflow-hidden bg-red-50">
					<CardHeader className="pb-0">
						<CardTitle className="text-red-700">Error</CardTitle>
					</CardHeader>
					<CardContent className="pt-4">
						<p className="text-red-700">{fetchOrgsError}</p>
					</CardContent>
				</Card>
			)}

			{/* Organizations List */}
			{!isFetchingOrgs && !fetchOrgsError && (
				<OrganizationList
					organizations={filteredOrganizations}
					// Pass the selected acting user's ID
					actingAsUserId={actingAsUser?.id || null}
					isLoading={isAddingMember || isRemovingMember} // Show loading when adding/removing
					onAddSelf={handleAddMember}
					onRemoveSelf={handleRemoveMember}
					onViewMembers={handleViewMembers}
				/>
			)}

			{selectedOrg && (
				<MembersModal
					organization={selectedOrg}
					isOpen={isModalOpen}
					onClose={() => setIsModalOpen(false)}
				/>
			)}
		</div>
	);
}
