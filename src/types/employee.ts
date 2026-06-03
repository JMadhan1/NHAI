export type Shift = 'MORNING' | 'AFTERNOON' | 'NIGHT';
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LEAVE' | 'HOLIDAY';
export type LeaveType = 'ANNUAL' | 'SICK' | 'CASUAL';
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type Department =
  | 'Operations'
  | 'IT Support'
  | 'Field Services'
  | 'Administration'
  | 'Security';

export interface Employee {
  id: string;
  employeeId: string;
  name: string;
  designation: string;
  department: Department;
  shift: Shift;
  shiftStart: string;
  shiftEnd: string;
  joinDate: string;
  phone: string;
  enrolledFace: boolean;
  active: boolean;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  status: AttendanceStatus;
  hoursWorked?: number;
  note?: string;
}

export interface LeaveBalance {
  employeeId: string;
  annual: { total: number; used: number };
  sick: { total: number; used: number };
  casual: { total: number; used: number };
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  type: LeaveType;
  from: string;
  to: string;
  days: number;
  reason: string;
  status: LeaveStatus;
  appliedAt: number;
}

export interface Holiday {
  date: string;
  name: string;
  type: 'NATIONAL' | 'REGIONAL' | 'OPTIONAL';
}
