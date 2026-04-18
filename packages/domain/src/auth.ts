export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
  createdAt?: string;
}

export interface AuthSession {
  token: string;
}

export interface UpdateProfileInput {
  displayName?: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}
