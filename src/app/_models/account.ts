import { Role } from './role';

export class Account {
  id?: string;
  title?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: Role;
  isVerified?: boolean;
  created?: Date;
  updated?: Date;
  password?: string;
  passwordConfirm?: string;
  acceptTerms?: boolean;
  accessToken?: string;
  refreshToken?: string;
  jwtToken?: string;
}
