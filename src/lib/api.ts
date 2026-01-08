import axios, { AxiosInstance, AxiosError } from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Add token to requests
    this.client.interceptors.request.use(
      (config) => {
        const token = this.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Handle token refresh on 401
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as any;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const newToken = await this.refreshAccessToken();
            if (newToken) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed, logout user
            this.clearTokens();
            window.location.href = "/student/login";
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private getAccessToken(): string | null {
    // Check both authToken (from auth.ts) and accessToken (legacy)
    return localStorage.getItem("authToken") || localStorage.getItem("accessToken");
  }

  private getRefreshToken(): string | null {
    return localStorage.getItem("refreshToken");
  }

  private setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
  }

  private clearTokens(): void {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
  }

  private async refreshAccessToken(): Promise<string | null> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return null;
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
        refreshToken,
      });
      const { accessToken, refreshToken: newRefreshToken } = response.data;
      this.setTokens(accessToken, newRefreshToken);
      return accessToken;
    } catch (error) {
      this.clearTokens();
      return null;
    }
  }

  // Auth methods
  async getCurrentUser() {
    const response = await this.client.get("/auth/me");
    return response.data;
  }

  async logout() {
    try {
      await this.client.post("/auth/logout");
    } finally {
      this.clearTokens();
    }
  }

  // User methods
  async getUser(userId: string) {
    const response = await this.client.get(`/users/${userId}`);
    return response.data;
  }

  async updateUser(data: any) {
    const response = await this.client.put("/users/me", data);
    return response.data;
  }

  // Assessment methods (to be implemented)
  async getAptitudeAssessment() {
    const response = await this.client.get("/assessments/aptitude");
    return response.data;
  }

  async submitAptitudeAssessment(answers: any) {
    const response = await this.client.post("/assessments/aptitude/submit", {
      answers,
    });
    return response.data;
  }

  // Resume methods (to be implemented)
  async getResume() {
    const response = await this.client.get("/resume");
    return response.data;
  }

  async saveResume(data: any) {
    const response = await this.client.post("/resume", data);
    return response.data;
  }
}

export const apiClient = new ApiClient();

