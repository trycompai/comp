import * as React from "react";

import { cn } from "../utils";

interface InputProps extends React.ComponentProps<"input"> {
	leftIcon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
	({ className, type, leftIcon, ...props }, ref) => {
		const isUrl = type === "url";
		const isPrefix = props.prefix;

		const adornmentWidth = 82; // px, matches pl-[82px]
		const iconPadding = 36; // px, for left icon padding

		return (
			<div className={cn("relative w-full", className)}>
				{isPrefix && props.prefix && (
					<span
						className="absolute left-0 top-0 h-full flex items-center px-4 text-muted-foreground select-none text-sm md:text-sm border-r-1 border-input bg-foreground/5 cursor-default font-medium"
						style={{
							width: adornmentWidth,
							zIndex: 2,
							borderTopLeftRadius: "0.125rem",
							borderBottomLeftRadius: "0.125rem",
						}}
					>
						{props.prefix}
					</span>
				)}
				{leftIcon && !isUrl && !isPrefix && (
					<span className="absolute left-0 top-0 h-full flex items-center justify-center pl-3 text-muted-foreground pointer-events-none">
						{leftIcon}
					</span>
				)}
				<input
					type={type}
					// Add these attributes to help prevent interference from browser extensions
					autoComplete="off"
					data-lpignore="true"
					className={cn(
						"flex h-9 w-full rounded-sm border border-input bg-background py-1 text-base transition-colors",
						"placeholder:text-muted-foreground file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
						"focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0",
						"disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
						isPrefix ? "pl-[90px]" : leftIcon ? "pl-[36px]" : "px-3",
					)}
					ref={ref}
					{...props}
				/>
			</div>
		);
	},
);
Input.displayName = "Input";

export { Input };
