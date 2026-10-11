import { useEffect, useRef } from "react";
import { useGo, type HttpError } from "@refinedev/core";
import { useHRContext } from "@/house-context";
import {useTimeOffDraft} from "@/hooks/use-time-off-draft";
import { useGetEmployeeTimeOffUsage } from "@/hooks/use-get-employee-time-off-usage";
import { useForm } from "@refinedev/react-hook-form";
import { Controller } from "react-hook-form";
import { buildTimeOffPayload, type TimeOffFormValues as FormValues } from "@/utilities/time-off-form";
import { Box, Button, MenuItem, Select, Typography } from "@mui/material";
import dayjs from "dayjs";
import { leaveDaysInYear } from "@/utilities/leave-days";
import { PageHeader } from "@/components/layout/page-header";
import { InputText } from "@/components/input/text";
import { LoadingOverlay } from "@/components/loading-overlay";
import { InputDateStartsEnds } from "@/components/input/date-starts-ends";
import { TimeOffFormSummary } from "@/components/time-offs/form-summary";
import {
  type TimeOff,
  TimeOffType,
  TimeOffStatus,
} from "@/types";

export const PageEmployeeTimeOffsCreate = () => {
  const { employee, employees, setEmployeeId, room } = useHRContext();
  const go = useGo();
  const submitting = useRef(false);
  const alive = useRef(true);
  const session = useRef({ generation: 0, employeeId: employee?.id, room: room.locator });
  if (session.current.employeeId !== employee?.id || session.current.room !== room.locator) {
    session.current = { generation: session.current.generation + 1, employeeId: employee?.id, room: room.locator };
  }
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; session.current.generation++; };
  }, []);

  const {
    refineCore: { formLoading, onFinish },
    ...formMethods
  } = useForm<TimeOff, HttpError, FormValues>({
    defaultValues: {
      timeOffType: TimeOffType.ANNUAL,
      status: TimeOffStatus.PENDING,
      notes: "",
      dates: [null, null],
    },
    refineCoreProps: {
      redirect: false,
      successNotification: () => {
        return {
          message: "Time off queued in House. Waiting for synchronization.",
          type: "success",
        };
      },
    },
  });
  const { control, handleSubmit, formState, watch } = formMethods;
  const draft = useTimeOffDraft(room.locator, employee?.id, formMethods);

  const onFinishHandler = async (values: FormValues) => {
    if (submitting.current) return;
    submitting.current = true;
    const generation = session.current.generation;
    try {
      const payload = buildTimeOffPayload(employee?.id, values);
      const prepared = await draft.prepare(payload);
      const result = await onFinish(prepared as unknown as FormValues);
      if (result?.data && alive.current && session.current.generation === generation) {
        go({ to: { resource: "time-offs", action: "list" }, type: "replace" });
      }
    } catch {
      // Refine retains the form and displays the provider's save error.
    } finally { submitting.current = false; }

  };

  const timeOffType = watch("timeOffType");
  const status = watch("status");
  const selectedDays = watch("dates");
  const startsAt = selectedDays[0];
  const endsAt = selectedDays[1];
  const { annualCount } = useGetEmployeeTimeOffUsage({ employeeId: employee?.id, year: startsAt?.year() ?? dayjs().year() });
  const availableAnnualDays = (employee?.availableAnnualLeaveDays ?? 0) - annualCount;
  const requestedDays =
    startsAt && endsAt ? endsAt.diff(startsAt, "day") + 1 : 0;

  return (
    <>
      <LoadingOverlay loading={false}>
        {draft.error && <Typography role="alert" color="error">{draft.error}</Typography>}
        <Box>
          <PageHeader
            title={status === TimeOffStatus.APPROVED ? "Assign Time Off" : "Request Time Off"}
            showListButton
            showDivider
          />

          <Box
            component="form"
            onSubmit={handleSubmit(onFinishHandler)}
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: "24px",
              marginTop: "24px",
            }}
          >
            <Box>
              <Typography id="submission-action-label" variant="body2" sx={{ mb: 1 }}>Action</Typography>
              <Controller name="status" control={control} render={({ field }) => <Select {...field} aria-labelledby="submission-action-label" sx={{ minWidth: "240px" }}><MenuItem value={TimeOffStatus.PENDING}>Request review</MenuItem><MenuItem value={TimeOffStatus.APPROVED}>Assign approved leave</MenuItem></Select>} />
            </Box>
            <Box>
              <Typography id="form-employee-label" variant="body2" sx={{ mb: 1 }}>Employee</Typography>
              <Select aria-labelledby="form-employee-label" value={employee?.id ?? ""} onChange={(event) => setEmployeeId(String(event.target.value))} sx={{ minWidth: "240px" }}>
                {employees.map((item) => <MenuItem key={item.id} value={item.id}>{item.firstName} {item.lastName}</MenuItem>)}
              </Select>
            </Box>
            <Box>
              <Typography
                variant="body2"
                sx={{
                  mb: "8px",
                }}
              >
                Time Off Type
              </Typography>
              <Controller
                name="timeOffType"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    size="small"
                    sx={{
                      minWidth: "240px",
                      height: "40px",
                      "& .MuiSelect-select": {
                        paddingBlock: "10px",
                      },
                    }}
                  >
                    <MenuItem value={TimeOffType.ANNUAL}>Annual Leave</MenuItem>
                    <MenuItem value={TimeOffType.CASUAL}>Casual Leave</MenuItem>
                    <MenuItem value={TimeOffType.SICK}>Sick Leave</MenuItem>
                  </Select>
                )}
              />
            </Box>

            <Box>
              <Typography
                variant="body2"
                sx={{
                  mb: "16px",
                }}
              >
                Requested Dates
              </Typography>
              <Controller
                name="dates"
                control={control}
                rules={{
                  validate: (value) => {
                    if (!value[0] || !value[1]) {
                      return "Please select both start and end dates";
                    }

                    if (value[1].isBefore(value[0], "day")) return "End date must be on or after start date";
                    return true;
                  },
                }}
                render={({ field }) => {
                  return (
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: () => {
                          return {
                            sm: "1fr",
                            lg: "628px 1fr",
                          };
                        },
                        gap: "40px",
                      }}
                    >
                      <InputDateStartsEnds
                        {...field}
                        error={formState.errors.dates?.message}
                        availableAnnualDays={availableAnnualDays}
                        requestedDays={requestedDays}
                      />
                      {timeOffType === TimeOffType.ANNUAL && (
                        <Box
                          sx={{
                            display: "flex",
                            maxWidth: "628px",
                            alignItems: () => {
                              return {
                                lg: "flex-end",
                              };
                            },
                            justifyContent: () => {
                              return {
                                xs: "flex-end",
                                lg: "flex-start",
                              };
                            },
                          }}
                        >
                          <TimeOffFormSummary
                            availableAnnualDays={availableAnnualDays}
                            requestedDays={startsAt && endsAt ? leaveDaysInYear(startsAt.format("YYYY-MM-DD"), endsAt.format("YYYY-MM-DD"), startsAt.year()) : 0}
                            year={startsAt?.year() ?? dayjs().year()}
                          />
                        </Box>
                      )}
                    </Box>
                  );
                }}
              />
            </Box>

            <Box
              sx={{
                maxWidth: "628px",
              }}
            >
              <Controller
                name="notes"
                control={control}
                render={({ field, fieldState }) => {
                  return (
                    <InputText
                      {...field}
                      label="Notes"
                      error={fieldState.error?.message}
                      placeholder="Please enter your notes"
                      multiline
                      rows={3}
                    />
                  );
                }}
              />
            </Box>

            <Button
              variant="contained"
              size="large"
              type="submit"
              disabled={!employee || formLoading}
            >
              {status === TimeOffStatus.APPROVED ? "Assign Time Off" : "Send Request"}
            </Button>
          </Box>
        </Box>
      </LoadingOverlay>
    </>
  );
};
