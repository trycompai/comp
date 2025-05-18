import { Avatar, AvatarFallback, AvatarImageNext } from "@comp/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from "@comp/ui/dropdown-menu";
import { headers } from "next/headers";
import { SignOut } from "./sign-out";
import { auth } from "../lib/auth";

export async function UserMenu({ onlySignOut }: { onlySignOut?: boolean }) {
	const session = await auth.api.getSession({
		headers: await headers(),
	});

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Avatar className="rounded-full w-8 h-8 cursor-pointer">
					{session?.user?.image && (
						<AvatarImageNext
							src={session?.user?.image}
							alt={
								session?.user?.name ??
								session?.user?.email ??
								""
							}
							width={32}
							height={32}
							quality={100}
						/>
					)}
					<AvatarFallback>
						<span className="text-xs">
							{session?.user?.name?.charAt(0)?.toUpperCase() ||
								session?.user?.email?.charAt(0)?.toUpperCase()}
						</span>
					</AvatarFallback>
				</Avatar>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				className="w-[240px]"
				sideOffset={10}
				align="end"
			>
				{!onlySignOut && (
					<DropdownMenuLabel>
						<div className="flex justify-between items-center">
							<div className="flex flex-col">
								<span className="truncate line-clamp-1 max-w-[155px] block">
									{session?.user?.name}
								</span>
								<span className="truncate text-xs text-[#606060] font-normal">
									{session?.user?.email}
								</span>
							</div>
							<div className="border py-0.5 px-3 rounded-full text-[11px] font-normal">
								Beta
							</div>
						</div>
					</DropdownMenuLabel>
				)}

				<SignOut />
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
