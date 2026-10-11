import type { Dayjs } from 'dayjs';
import { TimeOffStatus, TimeOffType, type TimeOff } from '@/types';

export type TimeOffFormValues = {
  timeOffType: TimeOffType;
  status: TimeOffStatus.PENDING | TimeOffStatus.APPROVED;
  notes: string;
  dates: [Dayjs | null, Dayjs | null];
};

export function buildTimeOffPayload(employeeId: string | undefined, values: TimeOffFormValues): Pick<TimeOff, 'employeeId' | 'timeOffType' | 'status' | 'notes' | 'startsAt' | 'endsAt'> {
  const [start, end] = values.dates;
  if (!employeeId) throw new Error('Choose an employee.');
  if (!start?.isValid() || !end?.isValid()) throw new Error('Please select both start and end dates');
  if (end.isBefore(start, 'day')) throw new Error('End date must be on or after start date');
  if (values.status !== TimeOffStatus.PENDING && values.status !== TimeOffStatus.APPROVED) throw new Error('Choose request review or assigned approved leave.');
  return { employeeId, timeOffType: values.timeOffType, status: values.status, notes: values.notes.trim(), startsAt: start.format('YYYY-MM-DD'), endsAt: end.format('YYYY-MM-DD') };
}
