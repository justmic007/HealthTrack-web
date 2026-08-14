// lib/api.ts — typed fetch wrapper for the HealthTrack API.
// Reads the base URL from NEXT_PUBLIC_API_BASE_URL (.env.local).

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

// ---- token storage (localStorage) -----------------------------------------
const TOKEN_KEY = "healthtrack_token";

export function getToken(): string | null {
    if (typeof window === "undefined") return null; // SSR guard
    return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
}

const REFRESH_KEY = "healthtrack_refresh";
export function getRefreshToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(REFRESH_KEY);
}
export function setRefreshToken(token: string): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(REFRESH_KEY, token);
}

// ---- core request helper --------------------------------------------------
export class ApiError extends Error {
    status: number;
    detail: unknown;
    constructor(status: number, detail: unknown, message: string) {
        super(message);
        this.status = status;
        this.detail = detail;
    }
}

type RequestOptions = { method?: string; body?: unknown; auth?: boolean };

// Single in-flight refresh shared across concurrent 401s (rotation-safe:
// the refresh token is one-time-use, so we must not fire two refreshes at once).
let _refreshInFlight: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
    const rt = getRefreshToken();
    if (!rt) return false;
    if (_refreshInFlight) return _refreshInFlight;
    _refreshInFlight = (async () => {
        try {
            const res = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ refresh_token: rt }),
            });
            if (!res.ok) return false;
            const data = await res.json();
            if (data?.access_token) setToken(data.access_token);
            if (data?.refresh_token) setRefreshToken(data.refresh_token); // rotation
            return !!data?.access_token;
        } catch {
            return false;
        } finally {
            _refreshInFlight = null;
        }
    })();
    return _refreshInFlight;
}

async function request<T>(path: string, opts: RequestOptions = {}, _retried = false): Promise<T> {
    const { method = "GET", body, auth = true } = opts;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (auth) {
        const token = getToken();
        if (token) headers["Authorization"] = `Bearer ${token}`;
    }
    const res = await fetch(`${BASE_URL}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    // On a 401, try a one-time token refresh, then retry the original request.
    if (res.status === 401 && auth && !_retried) {
        const ok = await refreshAccessToken();
        if (ok) return request<T>(path, opts, true);
        clearToken();
        if (typeof window !== "undefined") window.location.href = "/login";
        throw new ApiError(401, null, "Session expired");
    }

    if (res.status === 204) return undefined as T;
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) {
        const message =
            (data && (data.detail?.msg || data.detail || data.message)) ||
            `Request failed (${res.status})`;
        throw new ApiError(res.status, data?.detail ?? data, String(message));
    }
    return data as T;
}

export const api = {
    get: <T>(path: string, auth = true) => request<T>(path, { method: "GET", auth }),
    post: <T>(path: string, body?: unknown, auth = true) =>
        request<T>(path, { method: "POST", body, auth }),
    put: <T>(path: string, body?: unknown, auth = true) =>
        request<T>(path, { method: "PUT", body, auth }),
    del: <T>(path: string, auth = true) => request<T>(path, { method: "DELETE", auth }),
};

// ---- typed auth calls -----------------------------------------------------
export type LoginResponse = { access_token: string; refresh_token: string; token_type: string };

export async function login(email: string, password: string): Promise<LoginResponse> {
    const data = await api.post<LoginResponse>(
        "/api/v1/auth/login",
        { email, password },
        false,
    );
    setToken(data.access_token);
    if (data.refresh_token) setRefreshToken(data.refresh_token);
    return data;
}

export type CurrentUser = {
    id: string;
    email: string;
    full_name: string | null;
    user_type: string; // "patient" | "caregiver" | "lab_user" | "admin"
    is_active: boolean;
    license_number: string | null;
    license_type: string | null;
    license_state: string | null;
    license_verified: boolean;
};

export function getMe(): Promise<CurrentUser> {
    return api.get<CurrentUser>("/api/v1/auth/me");
}


// ---- test results ---------------------------------------------------------
export type Analyte = {
    name: string;
    result_type: string;
    value: number | string;
    unit?: string | null;
    reference_range?: { low?: number | null; high?: number | null } | null;
    significant_at?: string | null;
};

export type RawData = {
    test_type: string;
    result_type: string;
    analytes: Analyte[];
};

export type TestResult = {
    id: string;
    title: string;
    status: string; // normal | abnormal | borderline | ...
    date_taken: string;
    date_uploaded: string;
    summary_text: string | null;
    raw_data: RawData;
    file_url: string | null;
    lab_name: string | null;
    patient_name: string | null;
};

export type Page<T> = {
    items: T[];
    total: number;
    limit: number;
    offset: number;
};

export function listResults(limit = 50, offset = 0): Promise<Page<TestResult>> {
    return api.get<Page<TestResult>>(
        `/api/v1/test-results?limit=${limit}&offset=${offset}`,
    );
}

export function getResult(id: string): Promise<TestResult> {
    return api.get<TestResult>(`/api/v1/test-results/${id}`);
}

// ---- advisor --------------------------------------------------------------
export type Citation = {
    title: string;
    source: string;
    source_url: string;
};

export type AdvisorNote = {
    id: string;
    test_result_id: string;
    status: string; // "ok" | "deferred" | "no_data"
    guidance: string; // markdown
    citations: Citation[];
    model: string | null;
    prompt_version: string | null;
    created_at: string;
};

export function getAdvisorForResult(resultId: string): Promise<AdvisorNote> {
    return api.post<AdvisorNote>(`/api/v1/advisor/results/${resultId}`);
}

// ---- trends ---------------------------------------------------------------
export type TrendPoint = { value: number; date: string };

export type AnalyteTrend = {
    name: string;
    unit: string | null;
    direction: string; // "rising" | "falling" | "stable"
    delta: number | null;
    latest: number | null;
    points: TrendPoint[];
};

export function getTrends(): Promise<AnalyteTrend[]> {
    return api.get<AnalyteTrend[]>("/api/v1/test-results/trends");
}


// ---- reminders ------------------------------------------------------------
export type Reminder = {
    id: string;
    test_result_id: string | null;
    reminder_type: string; // "medication" | "follow_up" | "custom"
    title: string;
    description: string | null;
    due_datetime: string;
    recurrence_type: string;
    recurrence_data: unknown | null;
    is_completed: boolean;
    is_active: boolean;
    created_at: string;
    updated_at: string;
};

export type ReminderCreate = {
    title: string;
    reminder_type: string;
    due_datetime: string;
    description?: string;
};

export function listReminders(limit = 50, offset = 0, includeCompleted = false): Promise<Page<Reminder>> {
    const q = `limit=${limit}&offset=${offset}&include_completed=${includeCompleted}`;
    return api.get<Page<Reminder>>(`/api/v1/reminders?${q}`);
}

export function createReminder(body: ReminderCreate): Promise<Reminder> {
    return api.post<Reminder>("/api/v1/reminders", body);
}

export function completeReminder(id: string): Promise<Reminder> {
    return api.post<Reminder>(`/api/v1/reminders/${id}/complete`);
}

export function deleteReminder(id: string): Promise<void> {
    return api.del<void>(`/api/v1/reminders/${id}`);
}

// Build the .ics download URL (needs the token appended as a query param OR
// fetched with auth then blob-downloaded). We fetch with auth and trigger a blob.
export async function downloadReminderIcs(id: string, title: string): Promise<void> {
    const token = getToken();
    const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL ?? ""}/api/v1/reminders/${id}/calendar.ics`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
    );
    if (!res.ok) throw new Error("Could not download calendar file");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}


// ---- sharing --------------------------------------------------------------
export type Share = {
    id: string;
    test_result_id: string;
    patient_id: string;
    caregiver_id: string;
    date_shared: string;
    is_active: boolean;
    test_result_title: string;
    caregiver_name: string;
    caregiver_license_type: string | null;
    caregiver_license_number: string | null;
    caregiver_license_verified: boolean;
};

export type ShareCreate = {
    test_result_id: string;
    caregiver_email: string;
};

export function listMyShares(): Promise<Share[]> {
    return api.get<Share[]>("/api/v1/sharing/my-shares");
}

export function createShare(body: ShareCreate): Promise<Share> {
    return api.post<Share>("/api/v1/sharing", body);
}

export function revokeShare(id: string): Promise<void> {
    return api.del<void>(`/api/v1/sharing/${id}`);
}
// ---- profile --------------------------------------------------------------
export type PatientProfile = {
    id: string;
    user_id: string;
    date_of_birth: string | null;
    sex: string | null;
    height_cm: number | null;
    weight_kg: number | null;
    genotype: string | null;
    blood_type: string | null;
    known_conditions: string[];
    current_medications: string[];
    allergies: string[];
    family_history: string[];
    smoking_status: string | null;
    alcohol_use: string | null;
    dietary_restrictions: string[];
    activity_level: string | null;
    lifestyle_notes: string | null;
    created_at: string;
    updated_at: string;
};

export type PatientProfileUpdate = Partial<{
    date_of_birth: string;
    sex: string;
    height_cm: number;
    weight_kg: number;
    genotype: string;
    blood_type: string;
    known_conditions: string[];
    current_medications: string[];
    allergies: string[];
    family_history: string[];
    smoking_status: string;
    alcohol_use: string;
    dietary_restrictions: string[];
    activity_level: string;
    lifestyle_notes: string;
}>;

export function getProfile(): Promise<PatientProfile> {
    return api.get<PatientProfile>("/api/v1/profile/me");
}

export function updateProfile(body: PatientProfileUpdate): Promise<PatientProfile> {
    return api.put<PatientProfile>("/api/v1/profile/me", body);
}

// ---- whole-picture advisor (recommendations) ------------------------------
export type SuggestedReminder = {
    analyte: string;
    flag: string;
    reason: string;
    title: string;
};

export type Recommendation = {
    status: string; // "ok" | "no_data" | "deferred"
    recommendations: string | null; // markdown (null only when no_data)
    citations: Citation[];
    suggested_reminders: SuggestedReminder[];
};

export function getRecommendations(months?: number | null): Promise<Recommendation> {
    const q = months != null ? `?months=${months}` : "";
    return api.get<Recommendation>(`/api/v1/advisor/recommendations${q}`);
}

// Accept a suggested reminder — patient picks WHEN (due_datetime required).
export function acceptSuggestedReminder(body: {
    title: string;
    due_datetime: string; // ISO
    test_result_id?: string;
}): Promise<{ id: string; title: string; due_datetime: string }> {
    return api.post("/api/v1/advisor/reminders/accept", body);
}

// ---- caregiver: results shared with me ------------------------------------
export type SharedAnalyte = {
    name: string;
    result_type: string;
    value: number | string | null;
    unit: string | null;
    reference_range: { low: number | null; high: number | null } | null;
};

export type SharedResult = {
    id: string;
    patient_id: string;
    title: string;
    date_taken: string;
    date_uploaded: string;
    status: string; // normal | high | low | borderline | ...
    summary_text: string | null;
    raw_data: {
        test_type: string;
        result_type: string;
        analytes: SharedAnalyte[];
    } | null;
    lab_name: string | null;
    patient_name: string | null;
    patient_email: string | null;
    patient_phone: string | null;
};

export type SharedPage = {
    items: SharedResult[];
    total: number;
    limit: number;
    offset: number;
};

export function listSharedWithMe(limit = 50, offset = 0): Promise<SharedPage> {
    return api.get<SharedPage>(`/api/v1/sharing/shared-with-me?limit=${limit}&offset=${offset}`);
}

// ---- lab: create results, draft summaries, list lab results ---------------
export type LabResult = {
    id: string;
    patient_id: string | null;
    title: string;
    date_taken: string;
    date_uploaded: string;
    status: string;
    summary_text: string | null;
    raw_data: { test_type?: string; result_type?: string; analytes?: unknown[] } | null;
    patient_name: string | null;
    patient_email: string | null;
    lab_name: string | null;
    file_url: string | null;
};

export function listLabResults(limit = 50, offset = 0): Promise<Page<LabResult>> {
    return api.get<Page<LabResult>>(`/api/v1/test-results?limit=${limit}&offset=${offset}`);
}

// Ask the backend to draft a plain-language summary from raw_data (stateless).
export function draftSummary(body: { patient_email: string; raw_data: unknown }): Promise<{ draft: string }> {
    return api.post<{ draft: string }>("/api/v1/test-results/draft-summary", body);
}

// Create a test result. Uses multipart/form-data (optional file). raw_data is
// JSON-stringified into a form field, matching TestResultCreateForm.
export async function createTestResult(input: {
    patient_email: string;
    title: string;
    date_taken: string;   // ISO
    status: string;       // normal | borderline | abnormal
    summary_text: string;
    raw_data?: unknown;   // will be JSON.stringify'd
    file?: File | null;
}): Promise<LabResult> {
    const fd = new FormData();
    fd.append("patient_email", input.patient_email);
    fd.append("title", input.title);
    fd.append("date_taken", input.date_taken);
    fd.append("status", input.status);
    fd.append("summary_text", input.summary_text);
    if (input.raw_data != null) fd.append("raw_data", JSON.stringify(input.raw_data));
    if (input.file) fd.append("file", input.file);

    const token = getToken();
    const res = await fetch(`${BASE_URL}/api/v1/test-results`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd, // do NOT set Content-Type; the browser sets the multipart boundary
    });
    if (!res.ok) {
        let detail = `Request failed (${res.status})`;
        try { const j = await res.json(); detail = (j as { detail?: string }).detail ?? detail; } catch { }
        throw new ApiError(res.status, detail, detail);
    }
    return res.json() as Promise<LabResult>;
}

// ---- lab: extraction (OCR / text-layer) review flow -----------------------
export type ExtractionJob = {
    job_id: string;
    status: string; // queued | running | done | failed (backend enum values)
    source_path: string | null;
    extracted_text: string | null;
    candidate_payload: { test_type?: string; result_type?: string; analytes?: unknown[] } | null;
    unmatched_analytes: string[];
    error: string | null;
};

// Queue extraction of the result's uploaded file. Returns 202 + job info.
export function requestExtraction(id: string): Promise<{ job_id: string; status: string }> {
    return api.post<{ job_id: string; status: string }>(`/api/v1/test-results/${id}/extract`, {});
}

// Latest extraction job for review.
export function getExtraction(id: string): Promise<ExtractionJob> {
    return api.get<ExtractionJob>(`/api/v1/test-results/${id}/extraction`);
}

// Confirm (and optionally correct) the extracted candidate -> becomes raw_data.
export function confirmExtraction(
    id: string,
    raw_data: unknown,
    status?: string,
): Promise<TestResult> {
    const body: { raw_data: unknown; status?: string } = { raw_data };
    if (status) body.status = status;
    return api.post<TestResult>(`/api/v1/test-results/${id}/extraction/confirm`, body);
}

// ---- admin: analytics, lab approvals, user management, caregiver verify ----
export type SystemAnalytics = {
    total_test_results: number;
    test_results_by_status: Record<string, number>;
    test_results_by_lab: Record<string, number>;
    monthly_test_trends: Record<string, number>;
    total_labs: number;
    active_labs: number;
    pending_labs: number;
    total_users: number;
    users_by_type: Record<string, number>;
    active_users: number;
    inactive_users: number;
    recent_registrations: number;
    recent_test_uploads: number;
};

export type AdminLab = {
    id: string;
    name: string;
    clia_number: string;
    address: string;
    phone: string | null;
    email: string;
    website: string | null;
    status: string; // pending | approved | rejected | suspended
    is_active: boolean;
};

export type AdminUser = {
    id: string;
    email: string;
    full_name: string;
    user_type: string;
    is_active: boolean;
    license_number: string | null;
    license_type: string | null;
    license_state: string | null;
    license_verified: boolean;
};

export function getAnalytics(): Promise<SystemAnalytics> {
    return api.get<SystemAnalytics>("/api/v1/auth/admin/analytics");
}
export function getPendingLabs(): Promise<AdminLab[]> {
    return api.get<AdminLab[]>("/api/v1/auth/admin/labs/pending");
}
export function updateLabStatus(labId: string, status: string): Promise<AdminLab> {
    return api.put<AdminLab>(`/api/v1/auth/admin/labs/${labId}/status`, { status });
}
export function getInactiveUsers(): Promise<AdminUser[]> {
    return api.get<AdminUser[]>("/api/v1/auth/admin/users/inactive");
}
export function updateUserStatus(userId: string, is_active: boolean): Promise<AdminUser> {
    return api.put<AdminUser>(`/api/v1/auth/admin/users/${userId}/status`, { is_active });
}
export function verifyCaregiverLicense(userId: string): Promise<AdminUser> {
    return api.put<AdminUser>(`/api/v1/auth/admin/caregivers/${userId}/verify-license`, {});
}

// ---- registration + password reset ----------------------------------------
export type PatientSignup = {
  email: string;
  password: string;
  full_name: string;
  phone_number?: string;
};
export type CaregiverSignup = PatientSignup & {
  license_number: string;
  license_type: string;  // MD, RN, NP, PA, ...
  license_state: string; // two-letter code
};

export function registerPatient(input: PatientSignup): Promise<CurrentUser> {
  return api.post<CurrentUser>("/api/v1/auth/register/patient", input, false);
}
export function registerCaregiver(input: CaregiverSignup): Promise<CurrentUser> {
  return api.post<CurrentUser>("/api/v1/auth/register/caregiver", input, false);
}
export function requestPasswordReset(email: string): Promise<{ detail: string }> {
  return api.post<{ detail: string }>("/api/v1/auth/password-reset/request", { email }, false);
}
export function confirmPasswordReset(token: string, new_password: string): Promise<{ detail: string }> {
  return api.post<{ detail: string }>("/api/v1/auth/password-reset/confirm", { token, new_password }, false);
}

// Caregivers whose license the admin hasn't verified yet (active but unverified).
export function getPendingCaregivers(): Promise<AdminUser[]> {
  return api.get<AdminUser[]>("/api/v1/auth/admin/caregivers/pending");
}


// ---- admin console: full directories (all labs / all users) ----------------
export function getAllLabs(status?: string): Promise<AdminLab[]> {
  const q = status ? `?status=${encodeURIComponent(status)}` : "";
  return api.get<AdminLab[]>(`/api/v1/auth/admin/labs${q}`);
}
export function getAllUsers(userType?: string, isActive?: boolean): Promise<AdminUser[]> {
  const params = new URLSearchParams();
  if (userType) params.set("user_type", userType);
  if (isActive !== undefined) params.set("is_active", String(isActive));
  const q = params.toString() ? `?${params.toString()}` : "";
  return api.get<AdminUser[]>(`/api/v1/auth/admin/users${q}`);
}

// ---- email verification confirm --------------------------------------------
export function confirmEmailVerification(token: string): Promise<{ detail: string }> {
  return api.post<{ detail: string }>("/api/v1/auth/verify-email/confirm", { token }, false);
}
