import {useEffect, useRef, useState} from "react";
import type {UseFormReturn} from "react-hook-form";
import dayjs from "dayjs";
import {houseRuntime, openTimeOffDraft} from "../house";
import type {TimeOffFormValues} from "../utilities/time-off-form";
import {TimeOffStatus, TimeOffType} from "../types";

const serialize = (values: Partial<TimeOffFormValues>) => ({
  notes: values.notes ?? "",
  status: values.status ?? TimeOffStatus.PENDING,
  timeOffType: values.timeOffType ?? TimeOffType.ANNUAL,
  startsAt: values.dates?.[0]?.isValid() ? values.dates[0].format("YYYY-MM-DD") : "",
  endsAt: values.dates?.[1]?.isValid() ? values.dates[1].format("YYYY-MM-DD") : "",
});
type Session = Awaited<ReturnType<typeof openTimeOffDraft>>;
export function useTimeOffDraft(room: string, employeeId: string | undefined, form: UseFormReturn<TimeOffFormValues>) {
  const {watch, reset, getValues} = form;
  const opening = useRef<Promise<Session> | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!employeeId) return;
    let active = true;
    let restoring = false;
    let draft: Session | undefined;
    let latest = serialize(getValues());
    let pendingFields: Record<string, unknown> = {};
    const report = (value: unknown) => {if (active) setError(value instanceof Error ? value.message : String(value));};
    const apply = (saved: Record<string, unknown>) => {
      if (!active) return;
      const restored: TimeOffFormValues = {
        notes: String(saved.notes ?? ""),
        status: saved.status as TimeOffFormValues["status"],
        timeOffType: saved.timeOffType as TimeOffType,
        dates: [saved.startsAt ? dayjs(String(saved.startsAt)) : null, saved.endsAt ? dayjs(String(saved.endsAt)) : null],
      };
      if (JSON.stringify(serialize(restored)) === JSON.stringify(serialize(getValues()))) return;
      restoring = true;
      latest = serialize(restored);
      reset(restored);
      restoring = false;
    };
    const pending = houseRuntime().then(runtime => openTimeOffDraft(runtime, room, employeeId));
    opening.current = pending;
    const subscription = watch((values, {name}) => {
      if (restoring || !name) return;
      const next = serialize(values as TimeOffFormValues);
      const patch = Object.fromEntries(Object.entries(next).filter(([key, value]) => latest[key as keyof typeof latest] !== value));
      latest = next;
      pendingFields = {...pendingFields, ...patch};
      if (draft && Object.keys(patch).length) void draft.write(patch).catch(report);
    });
    void pending.then(async value => {
      draft = value;
      if (active) value.subscribe(apply);
      apply({...value.fields(), ...pendingFields});
      if (Object.keys(pendingFields).length) await value.write(pendingFields);
      if (!active) value.close();
    }).catch(report);
    return () => {active = false; subscription.unsubscribe(); draft?.close();};
  }, [room, employeeId, watch, reset, getValues]);
  return {
    error,
    async prepare(values: Record<string, unknown>) {
      try {
        if (!opening.current) throw new Error("Choose an employee before saving.");
        const draft = await opening.current;
        return await draft.prepare(values);
      } catch (failure) {
        setError(failure instanceof Error ? failure.message : String(failure));
        throw failure;
      }
    },
  };
}
