export type Employee = {
  id: string;
  createdAt: string;
  updatedAt: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  email: string;
  availableAnnualLeaveDays: number;
  teamId: string;
};

export type TimeOff = {
  id: string;
  createdAt: string;
  updatedAt: string;
  timeOffType: TimeOffType;
  startsAt: string;
  endsAt: string;
  notes: string;
  status: TimeOffStatus;
  employeeId: string;
};

export enum TimeOffStatus {
  PENDING = "Pending",
  APPROVED = "Approved",
  REJECTED = "Rejected",
}

export enum TimeOffType {
  ANNUAL = "Annual",
  SICK = "Sick",
  CASUAL = "Casual",
}
