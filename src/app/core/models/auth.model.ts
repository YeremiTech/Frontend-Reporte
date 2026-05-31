export interface AuthResponse {
  token: string;
  username: string;
  role: string;
  expiresInMs: number;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthUser {
  username: string;
  role: string;
}
