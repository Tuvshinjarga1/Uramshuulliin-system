import { Timestamp } from "firebase/firestore";

export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: "employee" | "admin" | "accountant";
  createdAt: string;
  updatedAt?: string;
  salary?: number;
  birthdate?: string;
  gender?: string;
  phone?: string;
  address?: string;
}

export interface Task {
  requirements: any;
  id: string;
  title: string;
  description: string;
  assignedTo: string;
  assignedBy: string;
  dueDate: Timestamp | Date;
  incentiveAmount: number;
  status: "pending" | "in-progress" | "completed" | "rejected";
  statusComment?: string;
  createdAt: Timestamp | Date;
  updatedAt?: Timestamp | Date;
  completedAt?: Timestamp | Date;
  evaluated?: boolean;
  evaluatedAt?: Timestamp | Date;
  totalPercentage?: number;
  rating?: number;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  uploadedAt?: string;
}

export interface IncentiveType {
  id: string;
  name: string;
  description: string;
  baseAmount: number;
  createdAt: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

export interface Incentive {
  id: string;
  userId: string;
  month: string;
  year: string;
  totalAmount: number;
  taskCount: number;
  tasks: string[];
  status: "pending" | "approved" | "rejected";
  statusComment?: string;
  createdAt: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}
