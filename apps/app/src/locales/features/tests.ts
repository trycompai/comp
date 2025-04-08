export const tests = {
	dashboard: {
		overview: "Overview",
		all: "All Tests",
		tests_by_assignee: "Tests by Assignee",
		passed: "Passed",
		failed: "Failed",
		severity_distribution: "Test Severity Distribution",
	},
	test_details: "Test Details",
	severity: {
		info: "Info",
		low: "Low",
		medium: "Medium",
		high: "High",
		critical: "Critical",
	},
	name: "Cloud Tests",
	title: "Cloud Tests",
	actions: {
		create: "Add Cloud Test",
		clear: "Clear filters",
		refresh: "Refresh",
		refresh_success: "Tests refreshed successfully",
		refresh_error: "Failed to refresh tests",
	},
	empty: {
		no_tests: {
			title: "No cloud tests yet",
			description: "Get started by creating your first cloud test.",
		},
		no_results: {
			title: "No results found",
			description: "No tests match your search",
			description_with_filters: "Try adjusting your filters",
		},
	},
	filters: {
		search: "Search tests...",
		role: "Filter by vendor",
	},
	register: {
		title: "Add Cloud Test",
		description: "Configure a new cloud compliance test.",
		submit: "Create Test",
		success: "Test created successfully",

		title_field: {
			label: "Test Title",
			placeholder: "Enter test title",
		},
		description_field: {
			label: "Description",
			placeholder: "Enter test description",
		},
		provider: {
			label: "Cloud Provider",
			placeholder: "Select cloud provider",
		},
		config: {
			label: "Test Configuration",
			placeholder: "Enter JSON configuration for the test",
		},
		auth_config: {
			label: "Authentication Configuration",
			placeholder: "Enter JSON authentication configuration",
		},
	},
	table: {
		title: "Title",
		provider: "Provider",
		status: "Status",
		severity: "Severity",
		result: "Result",
		createdAt: "Created At",
		assignedUser: "Assigned User",
		assignedUserEmpty: "Not Assigned",
		no_results: "No results found",
	},
} as const;
