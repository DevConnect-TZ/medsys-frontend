import axios, { AxiosInstance, AxiosError } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

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
  async login(email: string, password: string) {
    const response = await this.api.post('/auth/login', { email, password });
    if (response.data.token) {
      this.setToken(response.data.token);
    }
    return response.data;
  }

  async logout() {
    await this.api.post('/auth/logout');
    this.clearToken();
  }

  async getCurrentUser() {
    const response = await this.api.get('/auth/me');
    return response.data;
  }

  // Generic CRUD methods
  async get<T>(endpoint: string, params?: any): Promise<T> {
    const response = await this.api.get<T>(endpoint, { params });
    return response.data;
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    const response = await this.api.post<T>(endpoint, data);
    return response.data;
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    const response = await this.api.put<T>(endpoint, data);
    return response.data;
  }

  async delete<T>(endpoint: string): Promise<T> {
    const response = await this.api.delete<T>(endpoint);
    return response.data;
  }

  // Patients
  async getPatients(page = 1) {
    return this.get('/patients', { page });
  }

  async getPatient(id: number) {
    return this.get(`/patients/${id}`);
  }

  async createPatient(data: any) {
    return this.post('/patients', data);
  }

  async updatePatient(id: number, data: any) {
    return this.put(`/patients/${id}`, data);
  }

  async deletePatient(id: number) {
    return this.delete(`/patients/${id}`);
  }

  // Appointments
  async getAppointments(page = 1, params?: any) {
    return this.get('/appointments', { page, ...params });
  }

  async getMyAppointments(page = 1) {
    return this.get('/appointments', { page, my_queue: true });
  }

  async getAppointment(id: number) {
    return this.get(`/appointments/${id}`);
  }

  async createAppointment(data: any) {
    return this.post('/appointments', data);
  }

  async updateAppointment(id: number, data: any) {
    return this.put(`/appointments/${id}`, data);
  }

  async cancelAppointment(id: number) {
    return this.put(`/appointments/${id}/cancel`, {});
  }

  async doctorReviewAppointment(id: number, data: any) {
    return this.post(`/appointments/${id}/doctor-review`, data);
  }

  async markAppointmentPaid(id: number) {
    return this.post(`/appointments/${id}/mark-paid`, {});
  }

  async prescribeAppointment(id: number, data: any) {
    return this.post(`/appointments/${id}/prescribe`, data);
  }

  async dispenseAppointment(id: number) {
    return this.post(`/appointments/${id}/dispense`, {});
  }

  // Visits
  async getVisits(page = 1) {
    return this.get('/visits', { page });
  }

  async getVisit(id: number) {
    return this.get(`/visits/${id}`);
  }

  async createVisit(data: any) {
    return this.post('/visits', data);
  }

  async updateVisit(id: number, data: any) {
    return this.put(`/visits/${id}`, data);
  }

  // Lab Orders
  async getLabOrders(page = 1) {
    return this.get('/lab-orders', { page });
  }

  async createLabOrder(data: any) {
    return this.post('/lab-orders', data);
  }

  // Lab Results
  async getLabResults(page = 1) {
    return this.get('/lab-results', { page });
  }

  async createLabResult(data: any) {
    return this.post('/lab-results', data);
  }

  // Prescriptions
  async getPrescriptions(page = 1) {
    return this.get('/prescriptions', { page });
  }

  async createPrescription(data: any) {
    return this.post('/prescriptions', data);
  }

  // Invoices
  async getInvoices(page = 1) {
    return this.get('/invoices', { page });
  }

  async getInvoice(id: number) {
    return this.get(`/invoices/${id}`);
  }

  async createInvoice(data: any) {
    return this.post('/invoices', data);
  }

  async payInvoice(id: number, paymentData: any) {
    return this.put(`/invoices/${id}/pay`, paymentData);
  }

  // Medical Tests
  async getMedicalTests(params?: any) {
    return this.get('/medical-tests', params);
  }

  async createMedicalTest(data: any) {
    return this.post('/medical-tests', data);
  }

  async updateMedicalTest(id: number, data: any) {
    return this.put(`/medical-tests/${id}`, data);
  }

  async deleteMedicalTest(id: number) {
    return this.delete(`/medical-tests/${id}`);
  }

  // Pharmacy Inventory
  async getPharmacyInventory(params?: any) {
    return this.get('/pharmacy/inventory', params);
  }

  async createPharmacyInventory(data: any) {
    return this.post('/pharmacy/inventory', data);
  }

  async updatePharmacyInventory(id: number, data: any) {
    return this.put(`/pharmacy/inventory/${id}`, data);
  }

  // Users
  async getUsers(page = 1) {
    return this.get('/users', { page });
  }

  async inviteUser(data: any) {
    return this.post('/invitations', data);
  }

  async acceptInvitation(data: any) {
    return this.post('/users/accept-invitation', data);
  }
}

export const apiClient = new ApiClient();
