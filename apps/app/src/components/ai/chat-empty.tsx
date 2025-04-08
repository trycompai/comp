import { LogoSpinner } from "../logo-spinner";

type Props = {
	firstName: string;
};

export function ChatEmpty({ firstName }: Props) {
	return (
		<div className="w-full mt-[200px] todesktop:mt-24 md:mt-24 flex flex-col items-center justify-center text-center">
			<LogoSpinner raceColor="#00DC73" />
			<span className="font-medium text-xl mt-6">
				Hi {firstName}, how can I help <br />
				you today?
			</span>
		</div>
	);
}
