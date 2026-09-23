import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

// Falls back to a LAN address hint since "localhost" from a physical
// device/simulator does not point at your dev machine. Override this via
// app.json -> expo.extra.apiBaseUrl (or an EAS/env-based config) per
// environment instead of hardcoding it here.
const API_BASE_URL = 
Constants.expoConfig?.extra?.apiBaseUrl ||
 "http://192.168.29.112:4000/api";

export const TOKEN_KEY = "auth.token.att";
export const USER_KEY = "auth.user.att";

const client = axios.create({ baseURL: API_BASE_URL, timeout: 20000 });

client.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let onUnauthorized = null;
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

client.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401 && onUnauthorized) {
      await onUnauthorized();
    }
    return Promise.reject(normalizeError(error));
  }
);

function normalizeError(error) {
  if (error.response) {
    const message = error.response.data?.error || `Request failed (${error.response.status}).`;
    const err = new Error(message);
    err.status = error.response.status;
    err.isApiError = true;
    return err;
  }
  if (error.request) {
    const err = new Error("Could not reach the server. Check your connection.");
    err.isNetworkError = true;
    return err;
  }
  return error;
}

// ---------------------------------------------------------------
// Auth
// ---------------------------------------------------------------
export async function login(username, password) {
  const { data } = await client.post("/auth/login", { username, password });
  await AsyncStorage.setItem(TOKEN_KEY, data.token);
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
  return data.user;
}

export async function logout() {
  await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
}

export async function getStoredUser() {
  const raw = await AsyncStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function fetchMe() {
  const { data } = await client.get("/auth/me");
  return data;
}

// Self-service password change — same endpoint the web portal's "Change
// password" uses. Note this deliberately returns 400 (not 401) when
// currentPassword is wrong, so the interceptor above never treats a
// mistyped current password as a session expiry / forced logout.
export async function changePassword(currentPassword, newPassword) {
  const { data } = await client.patch("/auth/change-password", { currentPassword, newPassword });
  return data;
}

// ---------------------------------------------------------------
// Campuses & employees
//
// The backend now has a site -> campus hierarchy (a "site" like UTAS
// Nizwa has multiple campuses, e.g. North/South) — everything a
// supervisor works with (roster, sheets, scans) is scoped by campusId,
// not siteId. A supervisor's own campusId comes from their user object
// (AuthContext, populated from /auth/login and /auth/me).
// ---------------------------------------------------------------
export async function fetchCampuses() {
  const { data } = await client.get("/campuses");
  return data;
}

// campusId is optional here: the backend already auto-scopes a
// supervisor/viewer to their own campus server-side (see
// employees.routes.js), so this only needs to be passed explicitly for
// a role that can see more than one campus.
export async function fetchRoster(campusId) {
  const { data } = await client.get("/employees", {
    params: { campusId: campusId || undefined, status: "active" },
  });
  return data;
}

// ---------------------------------------------------------------
// OCR
// ---------------------------------------------------------------
export async function scanSheet({ campusId, photoUri, fileName = "sheet.jpg", mimeType = "image/jpeg" }) {
  const form = new FormData();
  form.append("campusId", String(campusId));
  form.append("image", { uri: photoUri, name: fileName, type: mimeType });

  const { data } = await client.post("/ocr/scan", form, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 45000, // OCR takes longer than a normal API call
  });
  return data;
}

// ---------------------------------------------------------------
// Attendance
// ---------------------------------------------------------------
export async function submitAttendance({ campusId, date, imageUrl, records }) {
  const { data } = await client.post("/attendance", { campusId, date, imageUrl, records });
  return data;
}

// GET /api/attendance now returns a paginated page, not a flat array:
// { total, limit, offset, sheets: [...] }. campusId is optional for the
// same auto-scoping reason as fetchRoster above — a supervisor gets
// their own campus's sheets with no param at all.
export async function fetchAttendanceHistory({ campusId, from, to, limit, offset, status } = {}) {
  const { data } = await client.get("/attendance", {
    params: { campusId: campusId || undefined, from, to, limit, offset, status },
  });
  return data; // { total, limit, offset, sheets }
}

// One previously-submitted sheet, with its full per-employee record
// list — what the "view my uploaded scans" screen drills into.
export async function fetchAttendanceSheet(sheetId) {
  const { data } = await client.get(`/attendance/${sheetId}`);
  return data;
}

export default client;