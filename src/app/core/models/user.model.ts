export type AppRole = 'ADMIN' | 'USER';

export interface UsuarioSummary {
  id: number;
  username: string;
  email: string;
  role: AppRole;
  active: boolean;
  createdAt: string;
  lastSeenAt?: string | null;
  online?: boolean;
}

export interface CreateUsuarioRequest {
  username: string;
  password: string;
  email: string;
  role: AppRole;
}

export interface UpdateUsuarioRequest {
  username: string;
  email: string;
  role: AppRole;
  active?: boolean;
  password?: string;
}
