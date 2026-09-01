export type Role = "student" | "warden" | "ksac";

export interface ISocietyPosition {
  society: string;
  position: "President" | "Vice-President" | string;
  allocatedRoom: string;
}

export interface IUser {
  _id: string;
  name: string;
  rollNo: string;
  email: string;
  role: Role;
  isSocietyLead?: boolean;
  society?: string;
  position?: string;
  allocatedRoom?: string;
  societyPositions?: ISocietyPosition[];
}

