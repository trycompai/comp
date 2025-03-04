import { MainNav } from "@/app/components/main-nav";

export function SiteHeader() {
	return (
		<header className="w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
			<div className="container-wrapper">
				<nav className="container flex h-14 items-center">
					<MainNav />
				</nav>
			</div>
		</header>
	);
}
