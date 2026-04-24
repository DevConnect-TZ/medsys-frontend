import axios, { AxiosInstance } from 'axios';
import type { User } from '@/lib/store';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

type ApiParams = Record<string, string | number | boolean | null | undefined>;
type ApiPayload = Record<string, unknown>;

export interface ApiPaginationMeta {
  current_page?: number;
  last_page?: number;
  per_page?: number;
  total?: number;
}

export interface ApiListResponse<T> {
  data?: T[];
  meta?: ApiPaginationMeta;
}

export type ApiResourceResponse<T, K extends string> = {
  data?: T;
} & Partial<Record<K, T>>;

interface ApiErrorResponse {
  message?: string;
}

export interface LoginResponse {
  token?: string;
  user?: User;
}

export interface CurrentUserResponse {
  user: User;
}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    return error.response?.data?.message || error.message || fallback;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

class ApiClient {
  private api: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.api = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    // Add token to requests
    this.api.interceptors.request.use((config) => {
      const token = this.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle response errors
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          this.clearToken();
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
    }
  }

  getToken(): string | null {
    if (this.token) return this.token;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('token');
    }
    return this.token;
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
    }
  }

  isAuthenticated(): boolean {
    return this.getToken() !== null;
  }

  // Auth endpoints
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await this.api.post<LoginResponse>('/auth/login', { email, password });
    if (response.data.token) {
      this.setToken(response.data.token);
    }
    return response.data;
  }

  async logout() {
    await this.api.post('/auth/logout');
    this.clearToken();
  }

  async getCurrentUser(): Promise<CurrentUserResponse> {
    const response = await this.api.get<CurrentUserResponse>('/auth/me');
    return response.data;
  }

  async updateProfile<T>(data: ApiPayload): Promise<T> {
    return this.put<T>('/auth/me', data);
  }

  async changePassword<T>(data: ApiPayload): Promise<T> {
    return this.post<T>('/auth/change-password', data);
  }

  // Generic CRUD methods
  async get<T>(endpoint: string, params?: ApiParams): Promise<T> {
    const response = await this.api.get<T>(endpoint, { params });
    return response.data;
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    const response = await this.api.post<T>(endpoint, data);
    return response.data;
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    const response = await this.api.put<T>(endpoint, data);
    return response.data;
  }

  async patch<T>(endpoint: string, data?: unknown): Promise<T> {
    const response = await this.api.patch<T>(endpoint, data);
    return response.data;
  }

  async delete<T>(endpoint: string): Promise<T> {
    const response = await this.api.delete<T>(endpoint);
    return response.data;
  }

  // Patients
  async getPatients<T>(page = 1, search = ''): Promise<ApiListResponse<T>> {
    const params: ApiParams = { page };
    if (search) params.search = search;
    return this.get<ApiListResponse<T>>('/patients', params);
  }

  async getPatient<T>(id: number): Promise<ApiResourceResponse<T, 'patient'>> {
    return this.get<ApiResourceResponse<T, 'patient'>>(`/patients/${id}`);
  }

  async createPatient<T>(data: ApiPayload): Promise<T> {
    return this.post('/patients', data);
  }

  async updatePatient<T>(id: number, data: ApiPayload): Promise<T> {
    return this.put(`/patients/${id}`, data);
  }

  async deletePatient(id: number) {
    return this.delete(`/patients/${id}`);
  }

  // Appointments
  async getAppointments<T>(page = 1, params?: ApiParams): Promise<ApiListResponse<T>> {
    return this.get<ApiListResponse<T>>('/appointments', { page, ...params });
  }

  async getMyAppointments<T>(page = 1): Promise<ApiListResponse<T>> {
    return this.get<ApiListResponse<T>>('/appointments', { page, my_queue: true });
  }

  async getAppointment<T>(id: number): Promise<ApiResourceResponse<T, 'appointment'>> {
    return this.get<ApiResourceResponse<T, 'appointment'>>(`/appointments/${id}`);
  }

  async createAppointment<T>(data: ApiPayload): Promise<T> {
    return this.post('/appointments', data);
  }

  async updateAppointment<T>(id: number, data: ApiPayload): Promise<T> {
    return this.put(`/appointments/${id}`, data);
  }

  async cancelAppointment(id: number) {
    return this.patch(`/appointments/${id}/cancel`, {});
  }

  async doctorReviewAppointment<T>(id: number, data: ApiPayload): Promise<T> {
    return this.post(`/appointments/${id}/doctor-review`, data);
  }

  async markAppointmentPaid(id: number) {
    return this.post(`/appointments/${id}/mark-paid`, {});
  }

  async confirmPharmacyPaymentAppointment(id: number) {
    return this.post(`/appointments/${id}/confirm-pharmacy-payment`, {});
  }

  async prescribeAppointment<T>(id: number, data: ApiPayload): Promise<T> {
    return this.post(`/appointments/${id}/prescribe`, data);
  }

  async dispenseAppointment(id: number) {
    return this.post(`/appointments/${id}/dispense`, {});
  }

  // Visits workflow
  async doctorReviewVisit<T>(id: number, data: ApiPayload): Promise<T> {
    return this.post(`/visits/${id}/doctor-review`, data);
  }

  async markVisitPaid(id: number) {
    return this.post(`/visits/${id}/mark-paid`, {});
  }

  async confirmPharmacyPaymentVisit(id: number) {
    return this.post(`/visits/${id}/confirm-pharmacy-payment`, {});
  }

  async prescribeVisit<T>(id: number, data: ApiPayload): Promise<T> {
    return this.post(`/visits/${id}/prescribe`, data);
  }

  async dispenseVisit(id: number) {
    return this.post(`/visits/${id}/dispense`, {});
  }

  // Wards & Beds
  async getWards<T>(): Promise<{ success: boolean; data?: T[] }> {
    return this.get<{ success: boolean; data?: T[] }>('/wards');
  }

  async createWard<T>(data: ApiPayload): Promise<{ success: boolean; message?: string; data?: T }> {
    return this.post<{ success: boolean; message?: string; data?: T }>('/wards', data);
  }

  async updateWard<T>(id: number, data: ApiPayload): Promise<{ success: boolean; message?: string; data?: T }> {
    return this.put<{ success: boolean; message?: string; data?: T }>(`/wards/${id}`, data);
  }

  async deleteWard(id: number) {
    return this.delete(`/wards/${id}`);
  }

  async getBeds<T>(params?: ApiParams): Promise<{ success: boolean; data?: T[] }> {
    return this.get<{ success: boolean; data?: T[] }>('/beds', params);
  }

  async createBed<T>(data: ApiPayload): Promise<{ success: boolean; message?: string; data?: T }> {
    return this.post<{ success: boolean; message?: string; data?: T }>('/beds', data);
  }

  async updateBed<T>(id: number, data: ApiPayload): Promise<{ success: boolean; message?: string; data?: T }> {
    return this.put<{ success: boolean; message?: string; data?: T }>(`/beds/${id}`, data);
  }

  async deleteBed(id: number) {
    return this.delete(`/beds/${id}`);
  }

  // Admissions
  async getAdmissions<T>(page = 1, params?: ApiParams): Promise<ApiListResponse<T>> {
    return this.get<ApiListResponse<T>>('/admissions', { page, ...params });
  }

  async createAdmission<T>(data: ApiPayload): Promise<{ success: boolean; message?: string; data?: T }> {
    return this.post<{ success: boolean; message?: string; data?: T }>('/admissions', data);
  }

  async dischargeAdmission(id: number): Promise<{ success: boolean; message?: string }> {
    return this.post('/admissions/' + id + '/discharge', {});
  }

  async completeReferral(id: number): Promise<{ success: boolean; message?: string }> {
    return this.post('/admissions/' + id + '/complete-referral', {});
  }

  // Visits
  async getVisits<T>(page = 1, params?: ApiParams): Promise<ApiListResponse<T>> {
    return this.get<ApiListResponse<T>>('/visits', { page, ...params });
  }

  async getVisit<T>(id: number): Promise<ApiResourceResponse<T, 'visit'>> {
    return this.get<ApiResourceResponse<T, 'visit'>>(`/visits/${id}`);
  }

  async createVisit<T>(data: ApiPayload): Promise<T> {
    return this.post('/visits', data);
  }

  async updateVisit<T>(id: number, data: ApiPayload): Promise<T> {
    return this.put(`/visits/${id}`, data);
  }

  // Lab Orders
  async getLabOrders<T>(page = 1, params?: ApiParams): Promise<ApiListResponse<T>> {
    return this.get<ApiListResponse<T>>('/labs/orders', { page, ...params });
  }

  async createLabOrder<T>(data: ApiPayload): Promise<T> {
    return this.post('/labs/orders', data);
  }

  // Lab Results
  async getLabResults<T>(page = 1): Promise<ApiListResponse<T>> {
    return this.get<ApiListResponse<T>>('/labs/orders', { page });
  }

  async createLabResult<T>(data: ApiPayload): Promise<T> {
    return this.post('/labs/results', data);
  }

  async getLabResultForOrder<T>(labOrderId: number): Promise<ApiResourceResponse<T, 'lab_result'>> {
    return this.get<ApiResourceResponse<T, 'lab_result'>>(`/labs/results/${labOrderId}`);
  }

  // Prescriptions
  async getPrescriptions<T>(page = 1): Promise<ApiListResponse<T>> {
    return this.get<ApiListResponse<T>>('/pharmacy/prescriptions', { page });
  }

  async createPrescription<T>(data: ApiPayload): Promise<T> {
    return this.post('/pharmacy/prescriptions', data);
  }

  // Invoices
  async getInvoices<T>(page = 1, params?: ApiParams): Promise<ApiListResponse<T>> {
    return this.get<ApiListResponse<T>>('/billing/invoices', { page, ...params });
  }

  async getInvoice<T>(id: number): Promise<ApiResourceResponse<T, 'invoice'>> {
    return this.get<ApiResourceResponse<T, 'invoice'>>(`/billing/invoices/${id}`);
  }

  async createInvoice<T>(data: ApiPayload): Promise<T> {
    return this.post('/billing/invoices', data);
  }

  async payInvoice<T>(id: number, paymentData: ApiPayload): Promise<T> {
    return this.patch(`/billing/invoices/${id}/pay`, paymentData);
  }

  // Medical Tests
  async getMedicalTests<T>(params?: ApiParams): Promise<ApiListResponse<T>> {
    return this.get<ApiListResponse<T>>('/medical-tests', params);
  }

  async createMedicalTest<T>(data: ApiPayload): Promise<T> {
    return this.post('/medical-tests', data);
  }

  async updateMedicalTest<T>(id: number, data: ApiPayload): Promise<T> {
    return this.put(`/medical-tests/${id}`, data);
  }

  async deleteMedicalTest(id: number) {
    return this.delete(`/medical-tests/${id}`);
  }

  // Doctor Schedules
  async getDoctorSchedules<T>(params?: ApiParams): Promise<{ success: boolean; data?: T[] }> {
    return this.get<{ success: boolean; data?: T[] }>('/doctor-schedules', params);
  }

  async createDoctorSchedule<T>(data: ApiPayload): Promise<{ success: boolean; message?: string; data?: T }> {
    return this.post<{ success: boolean; message?: string; data?: T }>('/doctor-schedules', data);
  }

  async updateDoctorSchedule<T>(id: number, data: ApiPayload): Promise<{ success: boolean; message?: string; data?: T }> {
    return this.put<{ success: boolean; message?: string; data?: T }>(`/doctor-schedules/${id}`, data);
  }

  async deleteDoctorSchedule(id: number) {
    return this.delete(`/doctor-schedules/${id}`);
  }

  async checkDoctorAvailability(params: ApiParams): Promise<{ success: boolean; available: boolean; message: string; schedule?: { start_time: string; end_time: string; day_name: string } }> {
    return this.get('/doctor-schedules/check-availability', params);
  }

  // Pharmacy Inventory
  async getPharmacyInventory<T>(params?: ApiParams): Promise<ApiListResponse<T>> {
    return this.get<ApiListResponse<T>>('/pharmacy/inventory', params);
  }

  async createPharmacyInventory<T>(data: ApiPayload): Promise<T> {
    return this.post('/pharmacy/inventory', data);
  }

  async updatePharmacyInventory<T>(id: number, data: ApiPayload): Promise<T> {
    return this.put(`/pharmacy/inventory/${id}`, data);
  }

  // Users
  async getUsers<T>(page = 1, params?: ApiParams): Promise<ApiListResponse<T>> {
    return this.get<ApiListResponse<T>>('/users', { page, ...params });
  }

  async getUser<T>(id: number): Promise<ApiResourceResponse<T, 'user'>> {
    return this.get<ApiResourceResponse<T, 'user'>>(`/users/${id}`);
  }

  async updateUser<T>(id: number, data: ApiPayload): Promise<T> {
    return this.put(`/users/${id}`, data);
  }

  async deleteUser(id: number) {
    return this.delete(`/users/${id}`);
  }

  async getInvitations<T>(page = 1, params?: ApiParams): Promise<ApiListResponse<T>> {
    return this.get<ApiListResponse<T>>('/invitations', { page, ...params });
  }

  async inviteUser<T>(data: ApiPayload): Promise<T> {
    return this.post('/invitations', data);
  }

  async acceptInvitation<T>(token: string, data: ApiPayload): Promise<T> {
    return this.post(`/invitations/${token}/accept`, data);
  }
}

export const apiClient = new ApiClient();
