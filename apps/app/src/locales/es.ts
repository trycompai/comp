// Core translations used across the application
import { common } from "./core/common";
import { errors } from "./core/errors";
import { language, languages } from "./core/language";

// Auth & onboarding related translations
import { auth } from "./auth/auth";
import { onboarding } from "./auth/onboarding";

// Layout & navigation translations
import { header } from "./layout/header";
import { not_found } from "./layout/not-found";
import { sidebar } from "./layout/sidebar";
import { theme } from "./layout/theme";
import { user_menu } from "./layout/user-menu";

// Feature translations
import { controls } from "./features/controls";
import { frameworks } from "./features/frameworks";
import { implementation } from "./features/implementation";
import { overview } from "./features/overview";
import { people } from "./features/people";
import { policies } from "./features/policies";
import { risk } from "./features/risk";
import { tests } from "./features/tests";
import { vendors } from "./features/vendors";

// Onboarding translations
import { app_onboarding } from "./onboarding/app-onboarding";

// Settings translations
import { settings } from "./settings/settings";

// Tasks translations
import { tasks } from "./features/tasks";

// Never add translations here, add them to the appropriate feature file.

export const translations = {
	// Core
	common,
	errors,
	language,
	languages,

	// Auth & Onboarding
	auth,
	onboarding,

	// Layout & Navigation
	header,
	not_found,
	sidebar,
	theme,
	user_menu,

	// Features
	controls,
	frameworks,
	implementation,
	overview,
	people,
	policies,
	risk,
	tests,
	vendors,
	tasks,

	// Onboarding
	app_onboarding,

	// Settings
	settings,
} as const;