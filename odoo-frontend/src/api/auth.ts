import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
    baseURL: API_URL,
    headers: { 'Content-Type': 'application/json' },
});

export interface SignupData { name: string; email: string; password: string; role?: string; }
export interface LoginData { email: string; password: string; }
export interface OTPVerifyData { email: string; otp: string; }
export interface ForgotPasswordData { email: string; }
export interface ResetPasswordData { email: string; otp: string; new_password: string; }

export const signup = (data: SignupData) => api.post('/auth/signup', data).then(r => r.data);
export const login = (data: LoginData) => api.post('/auth/login', data).then(r => r.data);
export const verifyOtp = (data: OTPVerifyData) => api.post('/auth/verify-otp', data).then(r => r.data);
export const forgotPassword = (data: ForgotPasswordData) => api.post('/auth/forgot-password', data).then(r => r.data);
export const resetPassword = (data: ResetPasswordData) => api.post('/auth/reset-password', data).then(r => r.data);
export const refreshToken = (refresh_token: string) => api.post('/auth/refresh', { refresh_token }).then(r => r.data);
export const getGoogleLoginUrl = () => `${API_URL}/oauth/google/login`;
export const getGithubLoginUrl = () => `${API_URL}/oauth/github/login`;
