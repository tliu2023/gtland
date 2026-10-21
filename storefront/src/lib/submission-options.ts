export const submissionTiers = {
  normal: "Normal",
  express: "Express",
  walkthrough: "Walkthrough",
  one_day: "1-day",
} as const;

export type SubmissionTier = keyof typeof submissionTiers;

export const organizations = ["PSA", "BGS"] as const;

export type Organization = (typeof organizations)[number];

// keep in sync with TIERS_BY_ORGANIZATION in management-api/cards/forms.py
export const tiersByOrganization: Record<Organization, SubmissionTier[]> = {
  PSA: ["normal", "express", "walkthrough"],
  BGS: ["normal", "express", "one_day"],
};

export function tierOptionsFor(organization: string): Record<string, string> {
  const tiers = tiersByOrganization[organization as Organization] ?? [];
  return Object.fromEntries(tiers.map((tier) => [tier, submissionTiers[tier]]));
}

export const submissionStatuses = {
  not_submitted: "Not submitted",
  submission: "Submission",
  in_progress: "In progress",
  completed: "Completed",
  returned: "Returned",
} as const;
