import { UserModel } from './models/user';

declare global {
  namespace Express {
    interface User extends UserModel {
      _dummy?: unknown;
    }
  }
}
