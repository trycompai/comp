import { setStaticParamsLocale } from "next-international/server";

/**
 * Helper function to set locale from params and return it
 * Use this in pages to avoid repetitive locale setup code
 */
export async function setupLocale(
	params: Promise<{ locale: string } & Record<string, string>>,
): Promise<string> {
	const resolvedParams = await params;
	const { locale } = resolvedParams;
	setStaticParamsLocale(locale);
	return locale;
}

/**
 * Get locale and other params from a params object
 * This is useful when you need both the locale and other route parameters
 */
export async function getParamsWithLocale<T extends Record<string, string>>(
	params: Promise<{ locale: string } & T>,
): Promise<{ locale: string } & T> {
	const resolvedParams = await params;
	const { locale } = resolvedParams;
	setStaticParamsLocale(locale);
	return resolvedParams;
}
