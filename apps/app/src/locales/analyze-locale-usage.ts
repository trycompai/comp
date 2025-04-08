import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { createInterface } from "node:readline/promises";

// This script analyzes translation usage in the codebase
// Features:
// 1. Finds unused translation keys
// 2. Detects duplicate translation values
// 3. Shows where translations are used

const DEBUG = false; // Set to false to check all translation keys

// Directories to search in
const SEARCH_DIRECTORIES = ["./src", "./../portal/src"];
// Always exclude node_modules from search
const EXCLUDE_DIR = "--exclude-dir=node_modules";

// Keys to exclude from unused check
// Supports wildcards with * at the end, e.g. 'common.frequency.*'
const EXCLUDE_KEYS = ["common.frequency.*", "common.status.*"];

// ANSI color codes for terminal output - using a minimal set
const COLORS = {
	reset: "\x1b[0m",
	bold: "\x1b[1m",

	red: "\x1b[31m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	blue: "\x1b[34m",
	cyan: "\x1b[36m",
	gray: "\x1b[90m",
};

// Main function - entry point
async function main() {
	console.log(
		`${COLORS.bold}${COLORS.blue}=====================================${COLORS.reset}`,
	);
	console.log(
		`${COLORS.bold}${COLORS.blue}  Translation Analysis Tool${COLORS.reset}`,
	);
	console.log(
		`${COLORS.bold}${COLORS.blue}=====================================${COLORS.reset}`,
	);

	console.log(
		`\n${COLORS.gray}Search directories: ${SEARCH_DIRECTORIES.join(", ")} (excluding node_modules)${COLORS.reset}`,
	);

	const rl = createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	console.log("\nWhat would you like to check?");
	console.log(`${COLORS.green}1) Find unused translations${COLORS.reset}`);
	console.log(`${COLORS.yellow}2) Find duplicate translations${COLORS.reset}`);
	console.log(`${COLORS.blue}3) Run both checks${COLORS.reset}`);

	const answer = await rl.question("\nEnter your choice (1-3) [default: 3]: ");
	const choice = answer.trim() || "3";

	const runUnused = ["1", "3"].includes(choice);
	const runDuplicates = ["2", "3"].includes(choice);

	if (!["1", "2", "3"].includes(choice)) {
		console.log(
			`${COLORS.red}Invalid choice. Running both checks.${COLORS.reset}`,
		);
	}

	rl.close();

	await findTranslationIssues(runUnused, runDuplicates);
}

// Main analysis function
async function findTranslationIssues(
	findUnused: boolean,
	findDuplicates: boolean,
) {
	try {
		// Generate a temporary JSON file with the translations
		const tempJsonPath = path.join(
			process.cwd(),
			"src/locales/translations.json",
		);

		// Create a temporary TypeScript file to convert the translations to JSON
		const converterPath = path.join(process.cwd(), "src/locales/converter.ts");
		createConverterScript(converterPath);

		try {
			// Run the converter script with ts-node
			console.log(
				`\n${COLORS.gray}Converting translations to JSON...${COLORS.reset}`,
			);
			execSync(`bunx tsx ${converterPath}`);

			// Read the JSON file
			const translationsJson = fs.readFileSync(tempJsonPath, "utf8");
			const translations = JSON.parse(translationsJson);

			// Extract all keys and their values
			const keyValuePairs = flattenObjectWithValues(translations);

			// Filter out language keys
			const filteredPairs = keyValuePairs.filter(
				(pair) => !pair.key.startsWith("languages."),
			);

			// Extract just the keys for unused key detection
			const allKeys = filteredPairs.map((pair) => pair.key);

			console.log(
				`${COLORS.blue}Found ${allKeys.length} translation keys to analyze.${COLORS.reset}`,
			);

			// Variables to store results
			const unusedKeys: string[] = [];
			const errors: string[] = [];
			let duplicatesWithLocations: Array<{
				value: string;
				keys: string[];
				locations: Record<string, string[]>;
			}> = [];

			// Find unused keys if requested
			if (findUnused) {
				console.log(
					`\n${COLORS.bold}${COLORS.green}Checking for unused translations...${COLORS.reset}`,
				);

				// Limit the number of keys to check in debug mode
				const keysToCheck = DEBUG ? allKeys.slice(0, 10) : allKeys;

				let count = 0;
				const total = keysToCheck.length;
				const updateInterval = Math.max(1, Math.floor(total / 20)); // Update progress ~20 times

				for (const key of keysToCheck) {
					try {
						count++;

						// Show progress periodically
						if (count % updateInterval === 0 || count === total) {
							const percent = Math.floor((count / total) * 100);
							process.stdout.write(
								`\r${COLORS.gray}Progress: ${percent}% (${count}/${total})${COLORS.reset}`,
							);
						}

						// Skip excluded keys - now with wildcard support
						const isExcluded = EXCLUDE_KEYS.some((excludePattern) => {
							if (excludePattern.endsWith("*")) {
								// For wildcard patterns, check if the key starts with the pattern minus the *
								const prefix = excludePattern.slice(0, -1);
								return key.startsWith(prefix);
							}
							return key === excludePattern;
						});

						if (isExcluded) {
							continue;
						}

						const isUsed = await isKeyUsedInCode(key);
						if (!isUsed) {
							unusedKeys.push(key);
						}
					} catch (error) {
						errors.push(`Error checking key ${key}: ${error}`);
					}
				}

				console.log("\n"); // New line after progress
			}

			// Find duplicate values if requested
			if (findDuplicates) {
				console.log(
					`\n${COLORS.bold}${COLORS.yellow}Checking for duplicate translations...${COLORS.reset}`,
				);

				// Find duplicate values
				const duplicates = findDuplicateValues(filteredPairs);
				console.log(
					`${COLORS.gray}Found ${duplicates.length} potential duplicates. Analyzing usage...${COLORS.reset}`,
				);

				// Find locations where duplicates are used
				duplicatesWithLocations = await findDuplicateLocations(duplicates);
			}

			// Report results
			displayResults(
				unusedKeys,
				duplicatesWithLocations,
				errors,
				findUnused,
				findDuplicates,
			);
		} finally {
			// Clean up temporary files
			if (fs.existsSync(tempJsonPath)) {
				fs.unlinkSync(tempJsonPath);
			}
			if (fs.existsSync(converterPath)) {
				fs.unlinkSync(converterPath);
			}
		}
	} catch (error) {
		console.error(`${COLORS.red}Error:${COLORS.reset}`, error);
	}
}

// Display the results in a nice format
function displayResults(
	unusedKeys: string[],
	duplicatesWithLocations: Array<{
		value: string;
		keys: string[];
		locations: Record<string, string[]>;
	}>,
	errors: string[],
	showUnused: boolean,
	showDuplicates: boolean,
) {
	console.log(
		`\n${COLORS.bold}${COLORS.blue}================== RESULTS ==================${COLORS.reset}`,
	);

	// Only show unused translations section if that check was requested
	if (showUnused) {
		if (unusedKeys.length > 0) {
			console.log(
				`\n${COLORS.bold}${COLORS.green}UNUSED TRANSLATIONS (${unusedKeys.length})${COLORS.reset}`,
			);
			console.log(
				`${COLORS.gray}These keys are defined but not used in the codebase:${COLORS.reset}\n`,
			);

			// Sort keys alphabetically for easier reading
			unusedKeys.sort();

			// Display full keys as a simple list
			for (const key of unusedKeys) {
				console.log(`${COLORS.yellow}- ${key}${COLORS.reset}`);
			}
		} else {
			console.log(
				`\n${COLORS.bold}${COLORS.green}No unused translations found.${COLORS.reset}`,
			);
		}
	}

	// Only show duplicate translations section if that check was requested
	if (showDuplicates) {
		if (duplicatesWithLocations.length > 0) {
			console.log(
				`\n${COLORS.bold}${COLORS.yellow}DUPLICATE TRANSLATIONS (${duplicatesWithLocations.length})${COLORS.reset}`,
			);
			console.log(
				`${COLORS.gray}These values are used in multiple translation keys:${COLORS.reset}\n`,
			);

			for (const dup of duplicatesWithLocations) {
				const ellipsis = dup.value.length > 60 ? "..." : "";
				const displayValue = dup.value.substring(0, 60) + ellipsis;

				console.log(
					`${COLORS.bold}"${displayValue}"${COLORS.reset} ${COLORS.yellow}(${dup.keys.length} places)${COLORS.reset}`,
				);

				for (const key of dup.keys) {
					if (dup.locations[key] && dup.locations[key].length > 0) {
						console.log(`  ${key}`);
						console.log(
							`    ${COLORS.gray}Used in: ${dup.locations[key].join(", ")}${COLORS.reset}`,
						);
					} else {
						// Mark unused duplicates
						console.log(`  ${key} ${COLORS.gray}(unused)${COLORS.reset}`);
					}
				}
				console.log(""); // Add a line break between duplicates
			}
		} else {
			console.log(
				`\n${COLORS.bold}${COLORS.yellow}No duplicate translations found.${COLORS.reset}`,
			);
		}
	}

	if (errors.length > 0) {
		console.log(
			`\n${COLORS.bold}${COLORS.red}ERRORS (${errors.length})${COLORS.reset}`,
		);
		console.log(
			`${COLORS.gray}Encountered these errors during analysis:${COLORS.reset}\n`,
		);
		for (const error of errors) {
			console.log(`${COLORS.red}- ${error}${COLORS.reset}`);
		}
	}

	console.log(
		`\n${COLORS.bold}${COLORS.blue}============================================${COLORS.reset}`,
	);
}

// Create a converter script that extracts translations to JSON
function createConverterScript(filePath: string) {
	const script = `
import fs from 'node:fs'
import path from 'node:path'

// Import the translations object from en.ts
import translations from './en'

// Write the translations to a JSON file
fs.writeFileSync(
  path.join(process.cwd(), 'src/locales/translations.json'),
  JSON.stringify(translations, null, 2)
)
`;
	fs.writeFileSync(filePath, script);
}

// Flatten an object into a list of dot-notation keys
function flattenObject(obj: Record<string, any>, prefix = ""): string[] {
	return Object.keys(obj).reduce((acc: string[], key) => {
		const pre = prefix.length ? `${prefix}.` : "";

		if (typeof obj[key] === "object" && obj[key] !== null) {
			acc.push(...flattenObject(obj[key], `${pre}${key}`));
		} else {
			acc.push(`${pre}${key}`);
		}

		return acc;
	}, []);
}

// Flatten an object into key-value pairs with dot-notation keys
function flattenObjectWithValues(
	obj: Record<string, any>,
	prefix = "",
): Array<{ key: string; value: string }> {
	return Object.entries(obj).reduce(
		(acc: Array<{ key: string; value: string }>, [key, value]) => {
			const pre = prefix.length ? `${prefix}.` : "";

			if (typeof value === "object" && value !== null) {
				acc.push(...flattenObjectWithValues(value, `${pre}${key}`));
			} else if (typeof value === "string") {
				acc.push({ key: `${pre}${key}`, value });
			}

			return acc;
		},
		[],
	);
}

// Find duplicate values in the translations
function findDuplicateValues(
	keyValues: Array<{ key: string; value: string }>,
): Array<{ value: string; keys: string[] }> {
	// Group by value
	const valueToKeys = keyValues.reduce(
		(acc: Record<string, string[]>, { key, value }) => {
			// Skip empty values or non-string values
			if (!value || typeof value !== "string") {
				return acc;
			}

			if (!acc[value]) {
				acc[value] = [];
			}
			acc[value].push(key);
			return acc;
		},
		{},
	);

	// Filter only duplicates and exclude very short strings (likely to be punctuation, etc.)
	return Object.entries(valueToKeys)
		.filter(([value, keys]) => keys.length > 1 && value.length > 1)
		.map(([value, keys]) => ({ value, keys }))
		.sort((a, b) => b.keys.length - a.keys.length); // Sort by number of duplicates
}

// Find locations where duplicate keys are used
async function findDuplicateLocations(
	duplicates: Array<{ value: string; keys: string[] }>,
): Promise<
	Array<{ value: string; keys: string[]; locations: Record<string, string[]> }>
> {
	const result = [];

	for (const dup of duplicates) {
		const locations: Record<string, string[]> = {};

		for (const key of dup.keys) {
			try {
				locations[key] = await findKeyUsageLocations(key);
			} catch (error) {
				locations[key] = [];
			}
		}

		result.push({
			value: dup.value,
			keys: dup.keys,
			locations,
		});
	}

	return result;
}

// Find locations where a key is used
async function findKeyUsageLocations(key: string): Promise<string[]> {
	try {
		const escapedKey = key.replace(/\./g, "\\.");
		const locations: string[] = [];

		// Check for t("key") pattern
		try {
			const doubleQuoteCmd = `grep -r "t(\\"${escapedKey}\\")" --include="*.tsx" --include="*.ts" --include="*.jsx" ${EXCLUDE_DIR} ${SEARCH_DIRECTORIES.join(" ")}`;
			const doubleQuoteResult = execSync(doubleQuoteCmd, {
				encoding: "utf8",
				stdio: ["pipe", "pipe", "ignore"],
			}).trim();

			if (doubleQuoteResult) {
				// Extract file paths from grep results
				const matches = doubleQuoteResult.split("\n");
				for (const match of matches) {
					const fileMatch = match.match(
						/^(?:\.\/src\/|\.\/portal\/)(.+?):/,
					)?.[1];
					if (fileMatch) {
						const directory = path.dirname(fileMatch);
						if (!locations.includes(directory)) {
							locations.push(directory);
						}
					}
				}
			}
		} catch (e) {
			// Grep returns exit code 1 if no matches
		}

		// Check for t('key') pattern
		try {
			const singleQuoteCmd = `grep -r "t('${escapedKey}')" --include="*.tsx" --include="*.ts" --include="*.jsx" ${EXCLUDE_DIR} ${SEARCH_DIRECTORIES.join(" ")}`;
			const singleQuoteResult = execSync(singleQuoteCmd, {
				encoding: "utf8",
				stdio: ["pipe", "pipe", "ignore"],
			}).trim();

			if (singleQuoteResult) {
				// Extract file paths from grep results
				const matches = singleQuoteResult.split("\n");
				for (const match of matches) {
					const fileMatch = match.match(
						/^(?:\.\/src\/|\.\/portal\/)(.+?):/,
					)?.[1];
					if (fileMatch) {
						const directory = path.dirname(fileMatch);
						if (!locations.includes(directory)) {
							locations.push(directory);
						}
					}
				}
			}
		} catch (e) {
			// Grep returns exit code 1 if no matches
		}

		// Also check for useI18n calls
		try {
			const i18nCmd = `grep -r "useI18n(\\"${escapedKey}\\")" --include="*.tsx" --include="*.ts" --include="*.jsx" ${EXCLUDE_DIR} ${SEARCH_DIRECTORIES.join(" ")}`;
			const i18nResult = execSync(i18nCmd, {
				encoding: "utf8",
				stdio: ["pipe", "pipe", "ignore"],
			}).trim();

			if (i18nResult) {
				// Extract file paths from grep results
				const matches = i18nResult.split("\n");
				for (const match of matches) {
					const fileMatch = match.match(
						/^(?:\.\/src\/|\.\/portal\/)(.+?):/,
					)?.[1];
					if (fileMatch) {
						const directory = path.dirname(fileMatch);
						if (!locations.includes(directory)) {
							locations.push(directory);
						}
					}
				}
			}
		} catch (e) {
			// Grep returns exit code 1 if no matches
		}

		return locations;
	} catch (error) {
		console.error(`Error finding usage locations for key ${key}:`, error);
		return [];
	}
}

// Check if a key is used in the codebase using grep
async function isKeyUsedInCode(key: string): Promise<boolean> {
	try {
		// Escape dots for grep
		const escapedKey = key.replace(/\./g, "\\.");

		// Check for different usage patterns using separate grep commands

		// 1. Check for t("key") pattern (including multi-line patterns)
		try {
			// Using PCRE regex with -P to handle multi-line patterns
			const doubleQuoteCmd = `grep -r "t(\\"${escapedKey}\\"" --include="*.tsx" --include="*.ts" --include="*.jsx" ${EXCLUDE_DIR} ${SEARCH_DIRECTORIES.join(" ")}`;
			const doubleQuoteResult = execSync(doubleQuoteCmd, {
				encoding: "utf8",
				stdio: ["pipe", "pipe", "ignore"],
			}).trim();
			if (doubleQuoteResult) {
				if (DEBUG) console.log(`Found double quote match for ${key}`);
				return true;
			}
		} catch (e) {
			// Grep returns exit code 1 if no matches, which causes execSync to throw
		}

		// 2. Check for t('key') pattern
		try {
			const singleQuoteCmd = `grep -r "t('${escapedKey}')" --include="*.tsx" --include="*.ts" --include="*.jsx" ${EXCLUDE_DIR} ${SEARCH_DIRECTORIES.join(" ")}`;
			const singleQuoteResult = execSync(singleQuoteCmd, {
				encoding: "utf8",
				stdio: ["pipe", "pipe", "ignore"],
			}).trim();
			if (singleQuoteResult) {
				if (DEBUG) console.log(`Found single quote match for ${key}`);
				return true;
			}
		} catch (e) {
			// Grep returns exit code 1 if no matches
		}

		// 3. Check for useI18n or useTranslations
		try {
			const i18nCmd = `grep -r "useI18n(\\"${escapedKey}\\")" --include="*.tsx" --include="*.ts" --include="*.jsx" ${EXCLUDE_DIR} ${SEARCH_DIRECTORIES.join(" ")}`;
			const i18nResult = execSync(i18nCmd, {
				encoding: "utf8",
				stdio: ["pipe", "pipe", "ignore"],
			}).trim();
			if (i18nResult) {
				if (DEBUG) console.log(`Found useI18n match for ${key}`);
				return true;
			}
		} catch (e) {
			// Grep returns exit code 1 if no matches
		}

		// 4. Check specifically for multi-line formatted translations
		try {
			// Using a simpler pattern to catch cases with formatting and line breaks
			const multilineCmd = `grep -r -l "${escapedKey}" --include="*.tsx" --include="*.ts" --include="*.jsx" ${EXCLUDE_DIR} ${SEARCH_DIRECTORIES.join(" ")} | xargs grep -l "t(" --include="*.tsx" --include="*.ts" --include="*.jsx"`;
			const multilineResult = execSync(multilineCmd, {
				encoding: "utf8",
				stdio: ["pipe", "pipe", "ignore"],
			}).trim();
			if (multilineResult) {
				if (DEBUG) console.log(`Found multi-line match for ${key}`);
				return true;
			}
		} catch (e) {
			// This might fail if no files contain the key or if xargs receives an empty input
		}

		// 5. As a last resort, try a more general search for the last part of the key
		// This might have more false positives but ensures we don't miss dynamic usages
		if (key.includes(".")) {
			const keyParts = key.split(".");
			const lastPart = keyParts[keyParts.length - 1];

			try {
				// Searching for patterns like: t("something.lastPart") or t(`${prefix}.lastPart`)
				const lastPartCmd = `grep -r "\\.${lastPart}" --include="*.tsx" --include="*.ts" --include="*.jsx" ${EXCLUDE_DIR} ${SEARCH_DIRECTORIES.join(" ")} | grep -v "analyze-locale-usage.ts" | grep -v "translations.json"`;
				const lastPartResult = execSync(lastPartCmd, {
					encoding: "utf8",
					stdio: ["pipe", "pipe", "ignore"],
				}).trim();

				// Only count this as a match if it's in a t() function call context
				if (
					lastPartResult &&
					(lastPartResult.includes("t(") || lastPartResult.includes("useI18n"))
				) {
					if (DEBUG)
						console.log(`Found last part match for ${key} (${lastPart})`);
					return true;
				}
			} catch (e) {
				// Grep returns exit code 1 if no matches
			}
		}

		// Not found in any pattern
		return false;
	} catch (error) {
		console.error(`Error checking key ${key}:`, error);
		return false;
	}
}

// Run the main function
main().catch(console.error);
