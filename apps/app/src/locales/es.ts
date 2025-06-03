// Core translations used across the application
import { common } from "./core/common-es";
import { errors } from "./core/errors-es";
import { language, languages } from "./core/language-es";

// Auth & onboarding related translations
import { auth } from "./auth/auth-es";
import { onboarding } from "./auth/onboarding-es";

// Layout & navigation translations
import { header } from "./layout/header-es";
import { not_found } from "./layout/not-found-es";
import { sidebar } from "./layout/sidebar-es";
import { theme } from "./layout/theme-es";
import { user_menu } from "./layout/user-menu-es";

// Feature translations
import { controls } from "./features/controls-es";
import { frameworks } from "./features/frameworks-es";
import { overview } from "./features/overview-es";
import { people } from "./features/people-es";
import { policies } from "./features/policies-es";
import { risk } from "./features/risk-es";
import { tests } from "./features/tests-es";
import { vendors } from "./features/vendors-es";

// Onboarding translations
import { app_onboarding } from "./onboarding/app-onboarding-es";

// Settings translations
import { settings } from "./settings/settings-es";

// Tasks translations
import { tasks } from "./features/tasks-es";

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
	overview,
	people,
	policies,
	risk,
	tests,
	vendors,

	// Settings
	settings,

	// Onboarding
	app_onboarding,

	// Tasks
	tasks,
} as const;

export type Translations = typeof translations;
export default translations;