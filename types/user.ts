export type Role = "student" | "warden" | "ksac";

export interface IUser {
  _id: string;
  name: string;
  rollNo: string;
  email: string;
  role: Role;
}
