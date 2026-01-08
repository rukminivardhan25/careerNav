import { Role } from "@prisma/client";

export interface GoogleProfile {
  id: string;
  displayName: string;
  emails: Array<{ value: string; verified?: boolean }>;
  photos?: Array<{ value: string }>;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: Role;
}

export interface OAuthSession {
  role: Role;
  callback: string;
}

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  role: Role;
}

