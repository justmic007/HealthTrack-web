// Synthetic seed accounts for one-click reviewer access. No real data.
// Remove an entry to hide that role everywhere.
export const DEMO_PASSWORD = "REMOVED";

export const DEMO_ACCOUNTS = [
  { role: "Patient", email: "amara@seed.healthtrack.dev", blurb: "Results, trends, AI guidance, sharing" },
  { role: "Caregiver", email: "caregiver@seed.healthtrack.dev", blurb: "Sees only what a patient shares" },
  { role: "Lab", email: "labuser@seed.healthtrack.dev", blurb: "Uploads results, PDF extraction" },
  { role: "Admin", email: "admin@seed.healthtrack.dev", blurb: "Lab review and platform analytics" },
];
