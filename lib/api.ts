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

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
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
export type LoginResponse = { access_token: string; token_type: string };

export async function login(email: string, password: string): Promise<LoginResponse> {
    const data = await api.post<LoginResponse>(
        "/api/v1/auth/login",
        { email, password },
        false,
    );
    setToken(data.access_token);
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
