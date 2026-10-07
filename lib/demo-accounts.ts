// Role labels for one-click reviewer access. No emails, no passwords:
// the API issues demo sessions itself (POST /api/v1/auth/demo-login).
export const DEMO_ACCOUNTS = [
  { role: "Patient", key: "patient", blurb: "Results, trends, AI guidance, sharing" },
  { role: "Caregiver", key: "caregiver", blurb: "Sees only what a patient shares" },
  { role: "Lab", key: "lab", blurb: "Uploads results, PDF extraction" },
  { role: "Admin", key: "admin", blurb: "Lab review and platform analytics (read-only in the demo)" },
];
