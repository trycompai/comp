/**
 * GitHub API Types
 * These types are used for type safety in GitHub integration checks
 */

export interface GitHubOrg {
  login: string;
  id: number;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  private: boolean;
  default_branch: string;
  owner: { login: string };
  security_and_analysis?: {
    dependabot_security_updates?: { status: 'enabled' | 'disabled' };
    secret_scanning?: { status: 'enabled' | 'disabled' };
    secret_scanning_push_protection?: { status: 'enabled' | 'disabled' };
  };
}

export interface GitHubBranchProtection {
  required_pull_request_reviews?: {
    required_approving_review_count: number;
  };
  enforce_admins?: { enabled: boolean };
  required_status_checks?: { strict: boolean };
}

/**
 * Rules returned by /repos/{owner}/{repo}/rules/branches/{branch}
 * This includes both legacy branch protection AND rulesets
 */
export interface GitHubBranchRule {
  type: string; // e.g., 'pull_request', 'required_status_checks', 'non_fast_forward'
  ruleset_source_type?: string; // 'Repository' or 'Organization'
  ruleset_source?: string;
  ruleset_id?: number;
  parameters?: Record<string, unknown>;
}

/**
 * Ruleset returned by /repos/{owner}/{repo}/rulesets
 */
export interface GitHubRuleset {
  id: number;
  name: string;
  target: 'branch' | 'tag';
  source_type: 'Repository' | 'Organization';
  source: string;
  enforcement: 'disabled' | 'active' | 'evaluate';
  conditions?: {
    ref_name?: {
      include?: string[];
      exclude?: string[];
    };
  };
  rules?: Array<{
    type: string;
    parameters?: Record<string, unknown>;
  }>;
}

/**
 * Code scanning default setup response
 * Returned by /repos/{owner}/{repo}/code-scanning/default-setup
 */
export interface GitHubCodeScanningDefaultSetup {
  state: 'configured' | 'not-configured';
  languages?: string[];
  query_suite?: 'default' | 'extended';
  updated_at?: string;
}

/**
 * Git tree response
 * Returned by /repos/{owner}/{repo}/git/trees/{tree_sha}?recursive=1
 */
export interface GitHubTreeResponse {
  sha: string;
  url: string;
  truncated: boolean;
  tree: GitHubTreeEntry[];
}

export interface GitHubTreeEntry {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
  url: string;
}
