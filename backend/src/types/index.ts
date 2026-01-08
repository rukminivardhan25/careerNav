import { Role } from "@prisma/client";

export interface JWTPayload {
  userId: string;
  email: string;
  role: Role;
}

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  role: Role;
}

