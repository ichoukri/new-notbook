import { env } from "@/config/env";
import axios, { type AxiosInstance } from "axios";
import { useGlobalStore } from "@/core/global-store/index";
import type { TUser } from "../types";

const setUser = useGlobalStore.getState().setUser;

function redirectToAuthLogin(): void {
  const redirectUri = window.location.href;
  window.location.href = `${env.VITE_AUTH_FRONTEND_URL}/login?redirect_uri=${encodeURIComponent(redirectUri)}`;
}

function redirectToAuthLogout(): void {
  const redirectUri = window.location.href;
  window.location.href = `${env.VITE_AUTH_FRONTEND_URL}/logout?redirect_uri=${encodeURIComponent(redirectUri)}`;
}

class BackendApi {
  private readonly api: AxiosInstance;

  constructor(url: string) {
    this.api = axios.create({
      baseURL: url,
      withCredentials: true,
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          setUser(null);
          redirectToAuthLogin();
        }
        return Promise.reject(error);
      },
    );
  }

  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const response = await this.api.get<T>(path, { params });
    return response.data;
  }

  async findMany<T>(
    path: string,
    params?: Record<string, string>,
  ): Promise<T[]> {
    const response = await this.api.get<T[]>(path, { params });
    return response.data;
  }

  async findById<T>(
    path: string,
    id: string,
    params?: Record<string, string>,
  ): Promise<T> {
    const response = await this.api.get<T>(path + `/${id}`, { params });
    return response.data;
  }

  async create<TResponse, TInput = TResponse>(
    path: string,
    data: TInput,
  ): Promise<TResponse> {
    const response = await this.api.post<TResponse>(path, data);
    return response.data;
  }

  async update<T>(path: string, id: string, data: Partial<T>): Promise<T> {
    const response = await this.api.patch<T>(path + `/${id}`, data);
    return response.data;
  }

  async updateUser<T>(path: string, data: Partial<T>): Promise<T> {
    const response = await this.api.patch<T>(path, data);
    return response.data;
  }

  async delete(path: string, id: string): Promise<void> {
    await this.api.delete(path + `/${id}`);
  }

  async deleteMany(path: string, data: { ids: string[] }): Promise<void> {
    const deleteManyPath = path.replace(/\/?$/, "/delete-many");
    await this.api.delete(deleteManyPath, { data });
  }

  async getFile(path: string, params?: Record<string, string>): Promise<Blob> {
    const response = await this.api.get<Blob>(path, {
      params,
      responseType: "blob",
    });
    return response.data;
  }

  async exportGraphs(body: { ids: string[]; name?: string }): Promise<Blob> {
    const response = await this.api.post<Blob>("/graphs/export", body);
    return response.data;
  }

  async fetchMe(): Promise<TUser> {
    const response = await this.api.get<{
      id: string;
      email?: string | null;
      username?: string | null;
      role_id?: string | null;
      tenant_id?: string | null;
      is_active?: boolean;
    }>("/me");
    const data = response.data;
    return {
      id: data.id,
      email: data.email ?? undefined,
      username: data.username ?? undefined,
      roleId: data.role_id ?? null,
      tenantId: data.tenant_id ?? null,
    };
  }

  signOut(): void {
    setUser(null);
    redirectToAuthLogout();
  }
}

const backendApi = new BackendApi(env.VITE_BACKEND_URL);

export { backendApi };
