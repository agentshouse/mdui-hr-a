import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import dayjs from 'dayjs';
import { QueryClient } from '@tanstack/react-query';
import type { DataProvider } from '@refinedev/core';
import { HRContext } from '../src/house-context';
import type { HouseRoom } from '../src/house';
import { TimeOffStatus, TimeOffType, type Employee, type TimeOff } from '../src/types';
import { ThemeProvider } from '../src/providers/theme-provider';
import { InputDateStartsEnds } from '../src/components/input/date-starts-ends';
import { UserSelect } from '../src/components/layout/sider/user-select';
import { TimeOffList } from '../src/components/time-offs/list';
import { TimeOffRequestModal } from '../src/components/requests/time-off-request-modal';
import { leaveDaysInYear } from '../src/utilities/leave-days';
import { buildTimeOffPayload } from '../src/utilities/time-off-form';

const { mutateAsync, cancelAsync, invalidate, state } = vi.hoisted(() => ({ mutateAsync: vi.fn(), cancelAsync: vi.fn(), invalidate: vi.fn(), state: { rows: [] as unknown[] } }));
vi.mock('@refinedev/core', async (importOriginal) => ({
  ...await importOriginal<typeof import('@refinedev/core')>(),
  useList: () => ({ result: { data: [], total: 0 }, query: { isLoading: false } }),
  useUpdate: () => ({ mutateAsync }),
  useDelete: () => ({ mutateAsync: cancelAsync }),
  useInfiniteList: () => ({ result: { data: { pages: [{ data: state.rows, total: state.rows.length }] }, hasNextPage: false }, query: { isLoading: false, fetchNextPage: vi.fn(), refetch: vi.fn(), error: null } }),
  useInvalidate: () => invalidate,
}));

vi.mock('@refinedev/mui', () => ({ DateField: ({ value, format }: { value: string | dayjs.Dayjs; format: string }) => <span>{dayjs(value).format(format)}</span> }));

const employee: Employee = { id: 'employee-a', firstName: 'Ada', lastName: 'Vale', jobTitle: 'Designer', email: 'ada@example.test', availableAnnualLeaveDays: 25, teamId: 'team-a', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' };
const employeeB = { ...employee, id: 'employee-b', firstName: 'Rowan', lastName: 'Reed' };
const request: TimeOff & { employee: Employee } = { id: 'request-a', employeeId: employee.id, employee, timeOffType: TimeOffType.ANNUAL, startsAt: '2026-10-19', endsAt: '2026-10-23', status: TimeOffStatus.PENDING, notes: 'Original request draft', createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z' };

afterEach(cleanup);
beforeEach(() => { state.rows = [request]; cancelAsync.mockReset().mockResolvedValue({ data: request }); mutateAsync.mockReset().mockResolvedValue({ data: request }); invalidate.mockReset().mockResolvedValue(undefined); });

describe('annual and usage day calculations', () => {
  it('counts inclusive days, leap days and year intersections', () => {
    expect(leaveDaysInYear('2026-10-19', '2026-10-23', 2026)).toBe(5);
    expect(leaveDaysInYear('2024-02-28', '2024-03-01', 2024)).toBe(3);
    expect(leaveDaysInYear('2026-12-29', '2027-01-03', 2026)).toBe(3);
    expect(leaveDaysInYear('2026-12-29', '2027-01-03', 2027)).toBe(3);
    expect(leaveDaysInYear('2026-10-19', '2026-10-23', 2027)).toBe(0);
    expect(leaveDaysInYear('invalid', '2026-10-23', 2026)).toBe(0);
  });
});

describe('create request and direct assignment', () => {
  for (const status of [TimeOffStatus.PENDING, TimeOffStatus.APPROVED] as const) it(`builds ${status} payload without calendar helpers`, () => {
    const payload = buildTimeOffPayload(employee.id, { status, timeOffType: TimeOffType.ANNUAL, notes: '  Holiday  ', dates: [dayjs('2026-10-19'), dayjs('2026-10-23')] });
    expect(payload).toEqual({ employeeId: employee.id, status, timeOffType: TimeOffType.ANNUAL, notes: 'Holiday', startsAt: '2026-10-19', endsAt: '2026-10-23' });
    expect(payload).not.toHaveProperty('dates');
  });
  it('rejects missing or reversed dates and missing employee', () => {
    const values = { status: TimeOffStatus.PENDING as const, timeOffType: TimeOffType.ANNUAL, notes: '', dates: [dayjs('2026-10-23'), dayjs('2026-10-19')] as [dayjs.Dayjs | null, dayjs.Dayjs | null] };
    expect(() => buildTimeOffPayload(employee.id, values)).toThrow('End date');
    expect(() => buildTimeOffPayload(employee.id, { ...values, dates: [null, null] })).toThrow('both start and end');
    expect(() => buildTimeOffPayload(undefined, values)).toThrow('Choose an employee');
  });
});

describe('donor UI adaptations', () => {
  it('shows two community calendars with the selected dates and validation', () => {
    const { rerender } = render(<ThemeProvider><InputDateStartsEnds value={[dayjs('2026-10-19'), dayjs('2026-10-23')]} onChange={vi.fn()} availableAnnualDays={25} requestedDays={5} /></ThemeProvider>);
    expect(screen.getAllByRole('grid')).toHaveLength(2);
    expect(screen.getByText('October 19, 2026')).toBeInTheDocument();
    expect(screen.getByText('October 23, 2026')).toBeInTheDocument();
    expect(screen.queryByText(/license key/i)).not.toBeInTheDocument();
    rerender(<ThemeProvider><InputDateStartsEnds value={[null, null]} onChange={vi.fn()} availableAnnualDays={25} requestedDays={0} error="Please select both start and end dates" /></ThemeProvider>);
    expect(screen.getByRole('alert')).toHaveTextContent('Please select both start and end dates');
  });

  it('emits date changes, clears an invalidated end and disables earlier end dates', () => {
    const onChange = vi.fn();
    render(<ThemeProvider><InputDateStartsEnds value={[dayjs('2026-10-19'), dayjs('2026-10-23')]} onChange={onChange} availableAnnualDays={25} requestedDays={5} /></ThemeProvider>);
    fireEvent.click(within(screen.getByLabelText('Start date')).getByRole('gridcell', { name: '24' }));
    expect(onChange.mock.calls[0][0][0].format('YYYY-MM-DD')).toBe('2026-10-24');
    expect(onChange.mock.calls[0][0][1]).toBeNull();
    expect(within(screen.getByLabelText('End date')).getByRole('gridcell', { name: '18' })).toBeDisabled();
    fireEvent.click(within(screen.getByLabelText('End date')).getByRole('gridcell', { name: '25' }));
    expect(onChange.mock.calls[1][0][1].format('YYYY-MM-DD')).toBe('2026-10-25');
  });

  it('selects a synthetic employee without identity or login controls', () => {
    const setEmployeeId = vi.fn();
    render(<ThemeProvider><HRContext.Provider value={{ employee, employees: [employee, employeeB], setEmployeeId, dataProvider: {} as DataProvider, queryClient: new QueryClient(), room: { locator: 'house://test', name: 'Test' } as HouseRoom }}><UserSelect /></HRContext.Provider></ThemeProvider>);
    expect(screen.getByText('Private synthetic workforce')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.queryByText(/log out|sign in/i)).not.toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Selected employee' }));
    fireEvent.click(screen.getByRole('option', { name: /Rowan Reed/ }));
    expect(setEmployeeId).toHaveBeenCalledWith('employee-b');
  });

  it('keeps the opened request snapshot and sends only the decision delta', async () => {
    const onSuccess = vi.fn();
    const { rerender } = render(<ThemeProvider><TimeOffRequestModal open loading={false} timeOff={request} onClose={vi.fn()} onSuccess={onSuccess} /></ThemeProvider>);
    rerender(<ThemeProvider><TimeOffRequestModal open loading={false} timeOff={{ ...request, notes: 'Changed elsewhere' }} onClose={vi.fn()} onSuccess={onSuccess} /></ThemeProvider>);
    expect(screen.getByText('Original request draft')).toBeInTheDocument();
    expect(screen.queryByText('Changed elsewhere')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Accept' }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
    expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ resource: 'time-offs', id: request.id, meta: { opened: request }, values: { status: TimeOffStatus.APPROVED }, successNotification: expect.objectContaining({ message: expect.stringContaining('queued in House') }) }));
  });

  it('preserves the modal draft and enables retry after a refused mutation', async () => {
    mutateAsync.mockRejectedValueOnce(new Error('This record changed elsewhere'));
    const onSuccess = vi.fn();
    render(<ThemeProvider><TimeOffRequestModal open loading={false} timeOff={request} onClose={vi.fn()} onSuccess={onSuccess} /></ThemeProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Decline' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Decline' })).not.toBeDisabled());
    expect(onSuccess).not.toHaveBeenCalled();
    expect(screen.getByText('Original request draft')).toBeInTheDocument();
  });
  it('cancels using the action-menu snapshot even after the list refreshes', async () => {
    const view = () => <ThemeProvider><HRContext.Provider value={{ employee, employees: [employee], setEmployeeId: vi.fn(), dataProvider: {} as DataProvider, queryClient: new QueryClient(), room: { locator: 'house://test', name: 'Test' } as HouseRoom }}><TimeOffList type="inReview" /></HRContext.Provider></ThemeProvider>;
    const { rerender } = render(view());
    fireEvent.click(screen.getByRole('button', { name: 'Request actions' }));
    state.rows = [{ ...request, notes: 'Changed after opening actions' }];
    rerender(view());
    fireEvent.click(screen.getByRole('button', { name: 'Cancel Request' }));
    await waitFor(() => expect(cancelAsync).toHaveBeenCalledOnce());
    expect(cancelAsync).toHaveBeenCalledWith(expect.objectContaining({ resource: 'time-offs', id: request.id, meta: { opened: request }, successNotification: expect.any(Function) }));
  });

  it('keeps cancellation open after a failed save', async () => {
    cancelAsync.mockRejectedValueOnce(new Error('Conflict'));
    render(<ThemeProvider><HRContext.Provider value={{ employee, employees: [employee], setEmployeeId: vi.fn(), dataProvider: {} as DataProvider, queryClient: new QueryClient(), room: { locator: 'house://test', name: 'Test' } as HouseRoom }}><TimeOffList type="inReview" /></HRContext.Provider></ThemeProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Request actions' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel Request' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Cancel Request' })).not.toBeDisabled());
    expect(cancelAsync).toHaveBeenCalledOnce();
  });

  it('keeps Close available while saving and prevents a late navigation after dismissal', async () => {
    let resolve!: (value: unknown) => void;
    const pending = new Promise((done) => { resolve = done; });
    mutateAsync.mockReturnValueOnce(pending);
    const onSuccess = vi.fn();
    const onClose = vi.fn();
    render(<ThemeProvider><TimeOffRequestModal open loading={false} timeOff={request} onClose={onClose} onSuccess={onSuccess} /></ThemeProvider>);
    const accept = screen.getByRole('button', { name: 'Accept' });
    fireEvent.click(accept);
    fireEvent.click(accept);
    expect(mutateAsync).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Close request' })).not.toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Close request' }));
    expect(onClose).toHaveBeenCalledOnce();
    await act(async () => { resolve({ data: request }); await pending; });
    expect(onSuccess).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalled();
  });

  it('does not navigate after a newer route unmounts a pending request', async () => {
    let resolve!: (value: unknown) => void;
    const pending = new Promise((done) => { resolve = done; });
    mutateAsync.mockReturnValueOnce(pending);
    const onSuccess = vi.fn();
    const { unmount } = render(<ThemeProvider><TimeOffRequestModal open loading={false} timeOff={request} onClose={vi.fn()} onSuccess={onSuccess} /></ThemeProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Accept' }));
    unmount();
    await act(async () => { resolve({ data: request }); await pending; });
    expect(onSuccess).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalled();
  });

  it('refreshes an unchanged-ID snapshot after the same mounted modal closes and reopens', async () => {
    const onSuccess = vi.fn();
    const onClose = vi.fn();
    const updated = { ...request, notes: 'Fresh snapshot after reopening' };
    const { rerender } = render(<ThemeProvider><TimeOffRequestModal open loading={false} timeOff={request} onClose={onClose} onSuccess={onSuccess} /></ThemeProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Close request' }));
    rerender(<ThemeProvider><TimeOffRequestModal open={false} loading={false} timeOff={updated} onClose={onClose} onSuccess={onSuccess} /></ThemeProvider>);
    rerender(<ThemeProvider><TimeOffRequestModal open loading={false} timeOff={updated} onClose={onClose} onSuccess={onSuccess} /></ThemeProvider>);
    expect(screen.getByText('Fresh snapshot after reopening')).toBeInTheDocument();
    expect(screen.queryByText('Original request draft')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Accept' }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
    expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ meta: { opened: updated } }));
  });

  it('suppresses a completed old submission after the same modal is reopened', async () => {
    let resolve!: (value: unknown) => void;
    const pending = new Promise((done) => { resolve = done; });
    mutateAsync.mockReturnValueOnce(pending);
    const onSuccess = vi.fn();
    const onClose = vi.fn();
    const updated = { ...request, notes: 'New review session' };
    const { rerender } = render(<ThemeProvider><TimeOffRequestModal open loading={false} timeOff={request} onClose={onClose} onSuccess={onSuccess} /></ThemeProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Accept' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close request' }));
    rerender(<ThemeProvider><TimeOffRequestModal open={false} loading={false} timeOff={updated} onClose={onClose} onSuccess={onSuccess} /></ThemeProvider>);
    rerender(<ThemeProvider><TimeOffRequestModal open loading={false} timeOff={updated} onClose={onClose} onSuccess={onSuccess} /></ThemeProvider>);
    await act(async () => { resolve({ data: request }); await pending; });
    expect(onSuccess).not.toHaveBeenCalled();
    expect(screen.getByText('New review session')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Accept' })).not.toBeDisabled();
  });

});
