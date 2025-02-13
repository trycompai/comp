export default {
  language: {
    title: "Languages",
    description: "Change the language used in the user interface.",
    placeholder: "Select language",
  },
  languages: {
    en: "English",
    es: "Spanish",
    fr: "French",
    no: "Norwegian",
    pt: "Portuguese",
  },
  common: {
    notifications: {
      inbox: "Inbox",
      archive: "Archive",
      archive_all: "Archive all",
      no_notifications: "No new notifications",
    },
    actions: {
      save: "Save",
      edit: "Edit",
      delete: "Delete",
      cancel: "Cancel",
      clear: "Clear",
      create: "Create",
      send: "Send",
      return: "Return",
      success: "Success",
      error: "Error",
      next: "Next",
      complete: "Complete",
    },
    assignee: {
      label: "Assignee",
      placeholder: "Select assignee",
    },
    date: {
      pick: "Pick a date",
      due_date: "Due Date",
    },
    status: {
      open: "Open",
      pending: "Pending",
      closed: "Closed",
      archived: "Archived",
      compliant: "Compliant",
      non_compliant: "Non Compliant",
      not_started: "Not Started",
      in_progress: "In Progress",
      published: "Published",
      needs_review: "Needs Review",
      draft: "Draft",
      not_assessed: "Not Assessed",
      assessed: "Assessed",
      active: "Active",
      inactive: "Inactive",
    },
    filters: {
      clear: "Clear filters",
      search: "Search...",
      status: "Status",
      department: "Department",
      owner: {
        label: "Assignee",
        placeholder: "Filter by assignee",
      },
    },
    table: {
      title: "Title",
      status: "Status",
      assigned_to: "Assigned To",
      due_date: "Due Date",
      last_updated: "Last Updated",
      no_results: "No results found",
    },
    empty_states: {
      no_results: {
        title: "No results",
        title_tasks: "No tasks found",
        title_risks: "No risks found",
        description: "Try another search, or adjusting the filters",
        description_filters: "Try another search, or adjusting the filters",
        description_no_tasks: "Create a task to get started",
        description_no_risks: "Create a risk to get started",
      },
      no_items: {
        title: "No items found",
        description: "Try adjusting your search or filters",
      },
    },
    pagination: {
      of: "of",
      items_per_page: "Items per page",
      rows_per_page: "Rows per page",
      page_x_of_y: "Page {{current}} of {{total}}",
      go_to_first_page: "Go to first page",
      go_to_previous_page: "Go to previous page",
      go_to_next_page: "Go to next page",
      go_to_last_page: "Go to last page",
    },
    comments: {
      title: "Comments",
      description: "Add a comment using the form below.",
      add: "Add Comment",
      new: "New Comment",
      save: "Save Comment",
      success: "Comment added successfully",
      error: "Failed to add comment",
      placeholder: "Write your comment here...",
      empty: {
        title: "No comments yet",
        description: "Be the first to add a comment",
      },
    },
    attachments: {
      title: "Attachments",
      description: "Add a file by clicking 'Add Attachment'.",
      upload: "Upload an attachment",
      upload_description:
        "Upload an attachment or add a link to an external resource.",
      drop: "Drop the files here",
      drop_description:
        "Drop files here or click to choose files from your device.",
      drop_files_description: "Files can be up to ",
      empty: {
        title: "No attachments",
        description: "Add a file by clicking 'Add Attachment'.",
      },
      toasts: {
        error: "Something went wrong, please try again.",
        error_uploading_files: "Cannot upload more than 1 file at a time",
        error_uploading_files_multiple: "Cannot upload more than 10 files",
        error_no_files_selected: "No files selected",
        error_file_rejected: "File {file} was rejected",
        error_failed_to_upload_files: "Failed to upload files",
        error_failed_to_upload_files_multiple: "Failed to upload files",
        error_failed_to_upload_files_single: "Failed to upload file",
        success_uploading_files: "Files uploaded successfully",
        success_uploading_files_multiple: "Files uploaded successfully",
        success_uploading_files_single: "File uploaded successfully",
        success_uploading_files_target: "Files uploaded",
        uploading_files: "Uploading {target}...",
        remove_file: "Remove file",
      },
    },
  },
  header: {
    discord: {
      button: "Join us on Discord",
    },
    feedback: {
      button: "Feedback",
      title: "Thank you for your feedback!",
      description: "We will be back with you as soon as possible",
      placeholder: "Ideas to improve this page or issues you are experiencing.",
      success: "Thank you for your feedback!",
      error: "Error sending feedback - try again?",
      send: "Send Feedback",
    },
  },
  not_found: {
    title: "404 - Page not found",
    description: "The page you are looking for does not exist.",
    return: "Return to dashboard",
  },
  theme: {
    options: {
      light: "Light",
      dark: "Dark",
      system: "System",
    },
  },
  sidebar: {
    overview: "Overview",
    policies: "Policies",
    risk: "Risk Management",
    vendors: "Vendors",
    integrations: "Integrations",
    settings: "Settings",
    evidence: "Evidence Tasks",
    people: "People",
  },
  sub_pages: {
    risk: {
      overview: "Risk Management",
      register: "Risk Register",
      risk_overview: "Risk Overview",
      risk_comments: "Risk Comments",
      tasks: {
        task_overview: "Task Overview",
      },
    },
    policies: {
      all: "All Policies",
      editor: "Policy Editor",
    },
    people: {
      all: "People",
      employee_details: "Employee Details",
    },
    settings: {
      members: "Team Members",
    },
    frameworks: {
      overview: "Frameworks",
    },
  },
  auth: {
    title: "Automate SOC 2, ISO 27001 and GDPR compliance with AI.",
    description:
      "Create a free account or log in with an existing account to continue.",
    options: "More options",
    google: "Continue with Google",
    email: {
      description: "Enter your email address to continue.",
      placeholder: "Enter email address",
      button: "Continue with email",
      magic_link_sent: "Magic link sent",
      magic_link_description: "Check your inbox for a magic link.",
      magic_link_try_again: "Try again.",
      success: "Email sent - check your inbox!",
      error: "Error sending email - try again?",
    },
    terms:
      "By clicking continue, you acknowledge that you have read and agree to the Terms of Service and Privacy Policy.",
  },
  onboarding: {
    title: "Create an organization",
    setup: "Setup",
    description: "Tell us a bit about your organization.",
    fields: {
      fullName: {
        label: "Your Name",
        placeholder: "Your full name",
      },
      name: {
        label: "Organization Name",
        placeholder: "Your organization name",
      },
      subdomain: {
        label: "Subdomain",
        placeholder: "example",
      },
      website: {
        label: "Website",
        placeholder: "Your organization website",
      },
    },
    success: "Thanks, you're all set!",
    error: "Something went wrong, please try again.",
    check_availability: "Checking availability",
    available: "Available",
    unavailable: "Unavailable",
  },
  overview: {
    title: "Overview",
    framework_chart: {
      title: "Framework Progress",
    },
    requirement_chart: {
      title: "Compliance Status",
    },
  },
  policies: {
    dashboard: {
      title: "Dashboard",
      all: "All Policies",
      policy_status: "Policy Status",
      policies_by_assignee: "Policies by Assignee",
      policies_by_framework: "Policies by Framework",
    },
    table: {
      name: "Policy Name",
      statuses: {
        draft: "Draft",
        published: "Published",
      },
      filters: {
        owner: {
          label: "Assignee",
          placeholder: "Filter by assignee",
        },
      },
    },
    filters: {
      search: "Search policies...",
      all: "All Policies",
    },
    status: {
      draft: "Draft",
      published: "Published",
      needs_review: "Needs Review",
    },
    policies: "policies",
  },
  evidence_tasks: {
    evidence_tasks: "Evidence Tasks",
    overview: "Overview",
  },
  risk: {
    risks: "risks",
    overview: "Overview",
    create: "Create New Risk",
    vendor: {
      title: "Vendor Management",
      dashboard: {
        title: "Vendor Dashboard",
        overview: "Vendor Overview",
        vendor_status: "Vendor Status",
        vendor_category: "Vendor Categories",
        vendors_by_assignee: "Vendors by Assignee",
        inherent_risk_description:
          "Initial risk level before any controls are applied",
        residual_risk_description:
          "Remaining risk level after controls are applied",
      },
      register: {
        title: "Vendor Register",
        table: {
          name: "Name",
          category: "Category",
          status: "Status",
          owner: "Owner",
        },
      },
      assessment: {
        title: "Vendor Assessment",
        update_success: "Vendor risk assessment updated successfully",
        update_error: "Failed to update vendor risk assessment",
        inherent_risk: "Inherent Risk",
        residual_risk: "Residual Risk",
      },
      form: {
        vendor_details: "Vendor Details",
        vendor_name: "Name",
        vendor_name_placeholder: "Enter vendor name",
        vendor_website: "Website",
        vendor_website_placeholder: "Enter vendor website",
        vendor_description: "Description",
        vendor_description_placeholder: "Enter vendor description",
        vendor_category: "Category",
        vendor_category_placeholder: "Select category",
        vendor_status: "Status",
        vendor_status_placeholder: "Select status",
        create_vendor_success: "Vendor created successfully",
        create_vendor_error: "Failed to create vendor",
        update_vendor: "Update Vendor",
        update_vendor_success: "Vendor updated successfully",
        update_vendor_error: "Failed to update vendor",
        add_comment: "Add Comment",
      },
      table: {
        name: "Name",
        category: "Category",
        status: "Status",
        owner: "Owner",
      },
      filters: {
        search_placeholder: "Search vendors...",
        status_placeholder: "Filter by status",
        category_placeholder: "Filter by category",
        owner_placeholder: "Filter by owner",
      },
      empty_states: {
        no_vendors: {
          title: "No vendors yet",
          description: "Get started by creating your first vendor",
        },
        no_results: {
          title: "No results found",
          description: "No vendors match your search",
          description_with_filters: "Try adjusting your filters",
        },
      },
      actions: {
        create: "Create Vendor",
      },
      status: {
        not_assessed: "Not Assessed",
        in_progress: "In Progress",
        assessed: "Assessed",
      },
      category: {
        cloud: "Cloud",
        infrastructure: "Infrastructure",
        software_as_a_service: "Software as a Service",
        finance: "Finance",
        marketing: "Marketing",
        sales: "Sales",
        hr: "HR",
        other: "Other",
      },
      risk_level: {
        low: "Low Risk",
        medium: "Medium Risk",
        high: "High Risk",
        unknown: "Unknown Risk",
      },
    },
    dashboard: {
      title: "Dashboard",
      overview: "Risk Overview",
      risk_status: "Risk Status",
      risks_by_department: "Risks by Department",
      risks_by_assignee: "Risks by Assignee",
      inherent_risk_description:
        "Inherent risk is calculated as likelihood * impact. Calculated before any controls are applied.",
      residual_risk_description:
        "Residual risk is calculated as likelihood * impact. This is the risk level after controls are applied.",
      risk_assessment_description: "Compare inherent and residual risk levels",
    },
    register: {
      title: "Risk Register",
      table: {
        risk: "Risk",
      },
      empty: {
        no_risks: {
          title: "Create a risk to get started",
          description:
            "Track and score risks, create and assign mitigation tasks for your team, and manage your risk register all in one simple interface.",
        },
        create_risk: "Create a risk",
      },
    },
    metrics: {
      probability: "Probability",
      impact: "Impact",
      inherentRisk: "Inherent Risk",
      residualRisk: "Residual Risk",
    },
    form: {
      update_inherent_risk: "Save Inherent Risk",
      update_inherent_risk_description:
        "Update the inherent risk of the risk. This is the risk level before any controls are applied.",
      update_inherent_risk_success: "Inherent risk updated successfully",
      update_inherent_risk_error: "Failed to update inherent risk",
      update_residual_risk: "Save Residual Risk",
      update_residual_risk_description:
        "Update the residual risk of the risk. This is the risk level after controls are applied.",
      update_residual_risk_success: "Residual risk updated successfully",
      update_residual_risk_error: "Failed to update residual risk",
      update_risk: "Update Risk",
      update_risk_description: "Update the risk title or description.",
      update_risk_success: "Risk updated successfully",
      update_risk_error: "Failed to update risk",
      create_risk_success: "Risk created successfully",
      create_risk_error: "Failed to create risk",
      risk_details: "Risk Details",
      risk_title: "Risk Title",
      risk_title_description: "Enter a name for the risk",
      risk_description: "Description",
      risk_description_description: "Enter a description for the risk",
      risk_category: "Category",
      risk_category_placeholder: "Select a category",
      risk_department: "Department",
      risk_department_placeholder: "Select a department",
      risk_status: "Risk Status",
      risk_status_placeholder: "Select a risk status",
    },
    tasks: {
      title: "Tasks",
      attachments: "Attachments",
      overview: "Task Overview",
      form: {
        title: "Task Details",
        task_title: "Task Title",
        status: "Task Status",
        status_placeholder: "Select a task status",
        task_title_description: "Enter a name for the task",
        description: "Description",
        description_description: "Enter a description for the task",
        due_date: "Due Date",
        due_date_description: "Select the due date for the task",
        success: "Task created successfully",
        error: "Failed to create task",
      },
      sheet: {
        title: "Create Task",
        update: "Update Task",
        update_description: "Update the task title or description.",
      },
      empty: {
        description_create:
          "Create a mitigation task for this risk, add a treatment plan, and assign it to a team member.",
      },
    },
  },
  people: {
    title: "People",
    details: {
      taskProgress: "Task Progress",
      tasks: "Tasks",
      noTasks: "No tasks assigned yet",
    },
    description: "Manage your team members and their roles.",
    filters: {
      search: "Search people...",
      role: "Filter by role",
    },
    actions: {
      invite: "Add Employee",
      clear: "Clear filters",
    },
    table: {
      name: "Name",
      email: "Email",
      department: "Department",
      externalId: "External ID",
    },
    empty: {
      no_employees: {
        title: "No employees yet",
        description: "Get started by inviting your first team member.",
      },
      no_results: {
        title: "No results found",
        description: "No employees match your search",
        description_with_filters: "Try adjusting your filters",
      },
    },
    invite: {
      title: "Add Employee",
      description: "Add an employee to your organization.",
      email: {
        label: "Email address",
        placeholder: "Enter email address",
      },
      role: {
        label: "Role",
        placeholder: "Select a role",
      },
      name: {
        label: "Name",
        placeholder: "Enter name",
      },
      department: {
        label: "Department",
        placeholder: "Select a department",
      },
      submit: "Add Employee",
      success: "Employee added successfully",
      error: "Failed to add employee",
    },
  },
  settings: {
    general: {
      title: "General",
      org_name: "Organization name",
      org_name_description:
        "This is your organizations visible name. You should use the legal name of your organization.",
      org_name_tip: "Please use 32 characters at maximum.",
      org_website: "Organization Website",
      org_website_description:
        "This is your organization's official website URL. Make sure to include the full URL with https://.",
      org_website_tip: "Please enter a valid URL including https://",
      org_website_error: "Error updating organization website",
      org_website_updated: "Organization website updated",
      org_delete: "Delete organization",
      org_delete_description:
        "Permanently remove your organization and all of its contents from the Comp AI platform. This action is not reversible - please continue with caution.",
      org_delete_alert_title: "Are you absolutely sure?",
      org_delete_alert_description:
        "This action cannot be undone. This will permanently delete your organization and remove your data from our servers.",
      org_delete_error: "Error deleting organization",
      org_delete_success: "Organization deleted",
      org_name_updated: "Organization name updated",
      org_name_error: "Error updating organization name",
      save_button: "Save",
      delete_button: "Delete",
      delete_confirm: "DELETE",
      delete_confirm_tip: "Type DELETE to confirm.",
      cancel_button: "Cancel",
    },
    members: {
      title: "Members",
    },
    billing: {
      title: "Billing",
    },
  },
  user_menu: {
    theme: "Theme",
    language: "Language",
    sign_out: "Sign out",
    account: "Account",
    support: "Support",
    settings: "Settings",
    teams: "Teams",
  },
  frameworks: {
    title: "Frameworks",
    overview: {
      error: "Failed to load frameworks",
      loading: "Loading frameworks...",
      empty: {
        title: "No frameworks selected",
        description:
          "Select frameworks to get started with your compliance journey",
      },
      progress: {
        title: "Framework Progress",
        empty: {
          title: "No frameworks yet",
          description:
            "Get started by adding a compliance framework to track your progress",
          action: "Add Framework",
        },
      },
      grid: {
        welcome: {
          title: "Welcome to Comp AI",
          description:
            "Get started by selecting the compliance frameworks you would like to implement. We'll help you manage and track your compliance journey across multiple standards.",
          action: "Get Started",
        },
        title: "Select Frameworks",
        version: "Version",
        actions: {
          clear: "Clear",
          confirm: "Confirm Selection",
        },
      },
    },
    controls: {
      title: "Controls",
      description: "Review and manage compliance controls",
      table: {
        status: "Status",
        control: "Control",
        artifacts: "Artifacts",
        actions: "Actions",
      },
      statuses: {
        not_started: "Not Started",
        compliant: "Compliant",
        non_compliant: "Non Compliant",
      },
    },
  },
  vendor: {
    title: "Dashboard",
    register_title: "Vendor Management",
    dashboard: {
      title: "Dashboard",
      overview: "Vendor Overview",
      vendor_status: "Vendor Status",
      vendor_category: "Vendor Categories",
      vendors_by_assignee: "Vendors by Assignee",
      inherent_risk_description:
        "Initial risk level before any controls are applied",
      residual_risk_description:
        "Remaining risk level after controls are applied",
    },
    register: {
      title: "Vendor Register",
      table: {
        name: "Name",
        category: "Category",
        status: "Status",
        owner: "Owner",
      },
    },
    category: {
      cloud: "Cloud",
      infrastructure: "Infrastructure",
      software_as_a_service: "SaaS",
      finance: "Finance",
      marketing: "Marketing",
      sales: "Sales",
      hr: "HR",
      other: "Other",
    },
    vendors: "vendors",
    form: {
      vendor_details: "Vendor Details",
      vendor_name: "Name",
      vendor_name_placeholder: "Enter vendor name",
      vendor_website: "Website",
      vendor_website_placeholder: "Enter vendor website",
      vendor_description: "Description",
      vendor_description_placeholder: "Enter vendor description",
      vendor_category: "Category",
      vendor_category_placeholder: "Select category",
      vendor_status: "Status",
      vendor_status_placeholder: "Select status",
      create_vendor_success: "Vendor created successfully",
      create_vendor_error: "Failed to create vendor",
      update_vendor_success: "Vendor updated successfully",
      update_vendor_error: "Failed to update vendor",
      contacts: "Vendor Contacts",
      contact_name: "Contact Name",
      contact_email: "Contact Email",
      contact_role: "Contact Role",
      add_contact: "Add Contact",
      new_contact: "New Contact",
      min_one_contact_required: "A vendor must have at least one contact",
    },
    empty_states: {
      no_vendors: {
        title: "No vendors yet",
        description: "Get started by creating your first vendor",
      },
      no_results: {
        title: "No results found",
        description: "No vendors match your search",
        description_with_filters: "Try adjusting your filters",
      },
    },
  },
  errors: {
    unexpected: "Something went wrong, please try again",
  },
} as const;
