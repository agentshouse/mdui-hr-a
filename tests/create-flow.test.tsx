import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { QueryClient } from '@tanstack/react-query';
import type { DataProvider } from '@refinedev/core';
import { HRContext } from '../src/house-context';
import type { HouseRoom } from '../src/house';
import type { Employee } from '../src/types';
import { ThemeProvider } from '../src/providers/theme-provider';
import { PageEmployeeTimeOffsCreate } from '../src/pages/employee/time-offs/create';

vi.mock("../src/hooks/use-time-off-draft", () => ({useTimeOffDraft: () => ({error: "", prepare: async (value: unknown) => value})}));
const { onFinish, go, state } = vi.hoisted(() => ({ onFinish: vi.fn(), go: vi.fn(), state: { redirect: undefined as unknown } }));
vi.mock('@refinedev/core', async (importOriginal) => ({ ...await importOriginal<typeof import('@refinedev/core')>(), useGo: () => go }));
vi.mock('../src/hooks/use-get-employee-time-off-usage', () => ({ useGetEmployeeTimeOffUsage: () => ({ annualCount: 0 }) }));
vi.mock('../src/components/layout/page-header', () => ({ PageHeader: ({ title }: { title: string }) => <h1>{title}</h1> }));
vi.mock('../src/components/input/date-starts-ends', () => ({ InputDateStartsEnds: React.forwardRef<HTMLDivElement>((_props, ref) => <div ref={ref}>Selected calendar dates</div>) }));
vi.mock('@refinedev/react-hook-form', async () => {
  const { useForm } = await import('react-hook-form');
  const dayjs = (await import('dayjs')).default;
  return { useForm: (options: { defaultValues: Record<string, unknown>; refineCoreProps: { redirect: unknown } }) => {
    state.redirect = options.refineCoreProps.redirect;
    return { ...useForm({ defaultValues: { ...options.defaultValues, notes: 'Keep my draft', dates: [dayjs('2026-10-19'), dayjs('2026-10-23')] } }), refineCore: { formLoading: false, onFinish } };
  } };
});
const employee: Employee = { id: 'employee-a', firstName: 'Ada', lastName: 'Vale', jobTitle: 'Designer', email: 'ada@example.test', availableAnnualLeaveDays: 25, teamId: 'team-a', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' };
const employeeB = { ...employee, id: 'employee-b', firstName: 'Rowan' };
const client = new QueryClient();
const view = (selected = employee, room = 'house://test') => <ThemeProvider><HRContext.Provider value={{ employee: selected, employees: [employee, employeeB], setEmployeeId: vi.fn(), dataProvider: {} as DataProvider, queryClient: client, room: { locator: room, name: 'Test' } as HouseRoom }}><PageEmployeeTimeOffsCreate /></HRContext.Provider></ThemeProvider>;
const deferred = () => { let resolve!: (value: unknown) => void; const promise = new Promise((done) => { resolve = done; }); return { promise, resolve }; };
const submit = async () => { fireEvent.click(screen.getByRole('button', { name: 'Send Request' })); await waitFor(() => expect(onFinish).toHaveBeenCalledOnce()); };
afterEach(cleanup);
beforeEach(() => { onFinish.mockReset(); go.mockReset(); state.redirect = undefined; });

describe('create form interrupted saves', () => {
  it('disables automatic redirect and navigates once after current-session success', async () => {
    onFinish.mockResolvedValue({ data: { id: 'created' } });
    render(view());
    await submit();
    await waitFor(() => expect(go).toHaveBeenCalledWith({ to: { resource: 'time-offs', action: 'list' }, type: 'replace' }));
    expect(state.redirect).toBe(false);
    expect(go).toHaveBeenCalledOnce();
    expect(onFinish.mock.calls[0][0]).toMatchObject({ employeeId: employee.id, status: 'Pending', notes: 'Keep my draft', startsAt: '2026-10-19', endsAt: '2026-10-23' });
    expect(onFinish.mock.calls[0][0]).not.toHaveProperty('dates');
  });
  it('suppresses late navigation after a newer route unmounts the form', async () => {
    const pending = deferred(); onFinish.mockReturnValue(pending.promise);
    const { unmount } = render(view());
    await submit(); unmount();
    await act(async () => { pending.resolve({ data: { id: 'created' } }); await pending.promise; });
    expect(go).not.toHaveBeenCalled();
  });
  it('suppresses late navigation when the selected employee changes', async () => {
    const pending = deferred(); onFinish.mockReturnValue(pending.promise);
    const { rerender } = render(view());
    await submit(); rerender(view(employeeB));
    await act(async () => { pending.resolve({ data: { id: 'created' } }); await pending.promise; });
    expect(go).not.toHaveBeenCalled();
  });
  it('suppresses late navigation when the selected Room changes', async () => {
    const pending = deferred(); onFinish.mockReturnValue(pending.promise);
    const { rerender } = render(view());
    await submit(); rerender(view(employee, 'house://other'));
    await act(async () => { pending.resolve({ data: { id: 'created' } }); await pending.promise; });
    expect(go).not.toHaveBeenCalled();
  });
  it('does not navigate for an undefined failed result and preserves notes', async () => {
    onFinish.mockResolvedValue(undefined);
    render(view()); await submit();
    expect(go).not.toHaveBeenCalled();
    expect(screen.getByPlaceholderText('Please enter your notes')).toHaveValue('Keep my draft');
  });
  it('catches a refused save and keeps the draft for retry', async () => {
    onFinish.mockRejectedValueOnce(new Error('House refused save'));
    render(view()); await submit();
    expect(go).not.toHaveBeenCalled();
    expect(screen.getByPlaceholderText('Please enter your notes')).toHaveValue('Keep my draft');
    onFinish.mockResolvedValueOnce({ data: { id: 'retry' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send Request' }));
    await waitFor(() => expect(go).toHaveBeenCalledOnce());
  });
  it('submits repeated clicks only once while the save is pending', async () => {
    const pending = deferred(); onFinish.mockReturnValue(pending.promise);
    render(view()); await submit();
    fireEvent.click(screen.getByRole('button', { name: 'Send Request' }));
    await act(async () => { await Promise.resolve(); });
    expect(onFinish).toHaveBeenCalledOnce();
    await act(async () => { pending.resolve({ data: { id: 'created' } }); await pending.promise; });
    expect(go).toHaveBeenCalledOnce();
  });
});
