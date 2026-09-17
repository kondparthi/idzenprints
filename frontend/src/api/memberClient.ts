/**
 * Separate axios instance for Member-facing requests. Deliberately NOT
 * sharing api/client.ts: that client stores its token under
 * "access_token" and redirects to the staff /login on a 401 — reusing
 * it here would let a member's token and a staff operator's token
 * clobber each other in localStorage (whichever logged in more
 * recently would silently win), and a member's session expiring would
 * incorrectly bounce them to the staff login screen.
 */
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api";
const MEMBER_TOKEN_KEY = "member_access_token";

export const memberApiClient = axios.create({ baseURL: API_BASE_URL });

export function setMemberToken(token: string) {
  localStorage.setItem(MEMBER_TOKEN_KEY, token);
}

export function getMemberToken(): string | null {
  return localStorage.getItem(MEMBER_TOKEN_KEY);
}

export function clearMemberToken() {
  localStorage.removeItem(MEMBER_TOKEN_KEY);
}

memberApiClient.interceptors.request.use((config) => {
  const token = getMemberToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

memberApiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearMemberToken();
      if (window.location.pathname !== "/member/login") {
        window.location.href = "/member/login";
      }
    }
    return Promise.reject(error);
  }
);
