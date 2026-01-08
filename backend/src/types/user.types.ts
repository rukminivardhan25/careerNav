/**
 * User-related type definitions
 */
import { Role } from "@prisma/client";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  provider: string;
  password?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  userId: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  dateOfBirth?: Date;
  location?: string;
  bio?: string;
  skills?: string[];
  experience?: number;
  domain?: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: Role;
}





