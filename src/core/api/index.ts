import { env } from "@/config/env";
import axios, { type AxiosInstance } from "axios";
import {
  clearStoredAuth,
  getStoredAccessToken,
  mapBackendUser,
  mapTokenResponse,
  persistAuth,
} from "@/core/auth";
import { useGlobalStore } from "@/core/global-store/index";
import type {
  TBackendTokenResponse,
  TBackendUser,
  TSigninInput,
  TSigninResponse,
  TSignupInput,
  TSignupResponse,
} from "../types";

const setUser = useGlobalStore.getState().setUser;

class BackendApi {
  private readonly api: AxiosInstance;

  constructor(url: string) {
    this.api = axios.create({
      baseURL: url,
    });

    this.setAccessToken(getStoredAccessToken());
    this.setupInterceptors();
  }

  private setAccessToken(accessToken: string | null) {
    if (accessToken) {
      this.api.defaults.headers.common["Authorization"] =
        `Bearer ${accessToken}`;
      return;
    }

    delete this.api.defaults.headers.common["Authorization"];
  }

  private setupInterceptors() {
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          clearStoredAuth();
          setUser(null);
          this.setAccessToken(null);
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

  async signUp(data: TSignupInput): Promise<TSignupResponse> {
    const response = await this.api.post<TBackendUser>("/auth/signup", {
      first_name: data.firstName.trim(),
      last_name: data.lastName.trim(),
      email: data.email.trim().toLowerCase(),
      password: data.password,
      confirm_password: data.confirmPassword,
    });

    return mapBackendUser(response.data);
  }

  async signIn(data: TSigninInput): Promise<TSigninResponse> {
    const formData = new URLSearchParams();
    formData.set("username", data.email.trim().toLowerCase());
    formData.set("password", data.password);

    const response = await this.api.post<TBackendTokenResponse>(
      "/auth/login",
      formData,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );

    const session = mapTokenResponse(response.data);
    persistAuth(session);
    setUser(session.user);
    this.setAccessToken(session.accessToken);
    return session;
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

  async signOut(): Promise<void> {
    clearStoredAuth();
    setUser(null);
    this.setAccessToken(null);
  }
}

const backendApi = new BackendApi(env.VITE_BACKEND_URL);

export { backendApi };
