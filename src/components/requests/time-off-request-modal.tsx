import {useLocalList} from "@/hooks/use-local-data";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useInvalidate, useUpdate } from "@refinedev/core";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Divider,
  Tooltip,
  Typography,
} from "@mui/material";
import dayjs from "dayjs";
import { leaveDaysInYear } from "@/utilities/leave-days";
import { Modal } from "@/components/modal";
import {
  TimeOffStatus,
  TimeOffType,
  type Employee,
  type TimeOff,
} from "@/types";
import { RequestTypeIcon, ThumbsDownIcon, ThumbsUpIcon } from "@/icons";
import { useGetEmployeeTimeOffUsage } from "@/hooks/use-get-employee-time-off-usage";

type Props = {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  onSuccess?: () => void;
  error?: string;
  timeOff:
    | (TimeOff & {
        employee: Employee;
      })
    | null
    | undefined;
};

export const TimeOffRequestModal = ({
  open,
  timeOff: fetchedTimeOff,
  loading: loadingFromProps,
  onClose,
  onSuccess,
  error,
}: Props) => {
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const alive = useRef(true);
  const session = useRef({ generation: 0, open, recordId: fetchedTimeOff?.id, dismissed: false });
  const opened = useRef<Props["timeOff"]>(null);
  if (session.current.open !== open || session.current.recordId !== fetchedTimeOff?.id) {
    session.current = { generation: session.current.generation + 1, open, recordId: fetchedTimeOff?.id, dismissed: false };
    opened.current = null;
  }
  if (open && !session.current.dismissed && !opened.current && fetchedTimeOff) opened.current = fetchedTimeOff;
  const timeOff = opened.current ?? fetchedTimeOff;

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; session.current.generation++; };
  }, []);

  const handleClose = () => {
    session.current.dismissed = true;
    session.current.generation++;
    opened.current = null;
    onClose();
  };

  const employeeUsedTimeOffs = useGetEmployeeTimeOffUsage({
    employeeId: timeOff?.employee?.id,
    year: dayjs(timeOff?.startsAt).year(),
  });

  const invalidate = useInvalidate();

  const { mutateAsync } = useUpdate<TimeOff>();

  const employee = timeOff?.employee;
  const duration =
    dayjs(timeOff?.endsAt).diff(dayjs(timeOff?.startsAt), "days") + 1;
  const remainingAnnualLeaveDays =
    (employee?.availableAnnualLeaveDays ?? 0) - employeeUsedTimeOffs.annualCount - (timeOff?.status === TimeOffStatus.PENDING ? leaveDaysInYear(timeOff.startsAt, timeOff.endsAt, dayjs(timeOff.startsAt).year()) : 0);

  const {
    result: timeOffsData,
    query: { isLoading: timeOffsLoading },
  } = useLocalList<TimeOff & { employee: Employee }>({
    resource: "time-offs",
    pagination: {
      pageSize: 999,
    },
    filters: [
      {
        field: "status",
        operator: "eq",
        value: TimeOffStatus.APPROVED,
      },
      {
        operator: "and",
        value: [
          {
            field: "startsAt",
            operator: "lte",
            value: timeOff?.endsAt,
          },
          {
            field: "endsAt",
            operator: "gte",
            value: timeOff?.startsAt,
          },
        ],
      },
    ],
    queryOptions: {
      enabled: !!timeOff,
    },
    meta: {
      join: ["employee"],
    },
  });
  const whoIsOutList = timeOffsData?.data || [];

  const handleSubmit = async (status: TimeOffStatus) => {
    if (!timeOff || !opened.current || savingRef.current || !open || session.current.dismissed) return;
    const generation = session.current.generation;
    const isCurrent = () => alive.current && session.current.open && !session.current.dismissed && session.current.generation === generation;
    savingRef.current = true;
    setSaving(true);
    try {
      await mutateAsync({
        resource: "time-offs",
        id: timeOff.id,
        meta: { opened: opened.current },
        invalidates: ["resourceAll"],
        values: { status },
        successNotification: { type: "success", message: `${status === TimeOffStatus.APPROVED ? "Approval" : "Decline"} queued in House. Waiting for synchronization.` },
      });
      if (!isCurrent()) return;
      await invalidate({ resource: "employees", invalidates: ["all"] });
      if (isCurrent()) onSuccess?.();
    } catch {
      // The mutation's notification preserves the provider's actionable error.
    } finally {
      savingRef.current = false;
      if (alive.current) setSaving(false);
    }
  };

  const loading = timeOffsLoading || loadingFromProps;

  return (
    <Modal
      open={open}
      title="Time Off Request"
      loading={loading}
      sx={{
        maxWidth: "520px",
      }}
      onClose={handleClose}
      footer={
        <>
          <Divider />
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "8px",
              padding: "24px",
            }}
          >
            <Button
              sx={{
                backgroundColor: (theme) => theme.palette.error.light,
              }}
              startIcon={<ThumbsDownIcon />}
              disabled={saving || loading || !timeOff || timeOff.status !== TimeOffStatus.PENDING}
              onClick={() => handleSubmit(TimeOffStatus.REJECTED)}
            >
              Decline
            </Button>
            <Button
              sx={{
                backgroundColor: (theme) => theme.palette.success.light,
              }}
              disabled={saving || loading || !timeOff || timeOff.status !== TimeOffStatus.PENDING}
              onClick={() => handleSubmit(TimeOffStatus.APPROVED)}
              startIcon={<ThumbsUpIcon />}
            >
              Accept
            </Button>
          </Box>
        </>
      }
    >
      {error && <Alert severity="error">{error}</Alert>}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          padding: "24px",
          backgroundColor: (theme) => theme.palette.grey[50],
          borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
        }}
      >
        <Avatar
          alt={employee?.firstName}
          sx={{
            width: "80px",
            height: "80px",
            marginRight: "24px",
          }}
        >{employee?.firstName[0]}{employee?.lastName[0]}</Avatar>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Typography
            variant="h2"
            fontSize="18px"
            lineHeight="28px"
            fontWeight="500"
          >
            {employee?.firstName} {employee?.lastName}
          </Typography>
          <Typography variant="caption">{employee?.jobTitle}</Typography>
        </Box>
      </Box>

      <Box
        sx={{
          padding: "24px",
        }}
      >
        <InfoRow
          loading={loading}
          label="Request Type"
          value={
            <Box
              component="span"
              sx={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <RequestTypeIcon type={timeOff?.timeOffType} />
              <Typography variant="body2" component="span">
                {timeOff?.timeOffType} Leave
              </Typography>
            </Box>
          }
        />
        <Divider />
        <InfoRow
          loading={loading}
          label="Duration"
          value={`${duration > 1 ? `${duration} days` : `${duration} day`}`}
        />
        <Divider />
        <InfoRow
          loading={loading}
          label={
            {
              [TimeOffType.ANNUAL]: `Remaining Annual Days (${dayjs(timeOff?.startsAt).year()})`,
              [TimeOffType.SICK]: "Previously Used Sick Leave Days",
              [TimeOffType.CASUAL]: "Previously Used Casual Leave Days",
            }[timeOff?.timeOffType ?? TimeOffType.ANNUAL]
          }
          value={
            {
              [TimeOffType.ANNUAL]: remainingAnnualLeaveDays,
              [TimeOffType.SICK]: employeeUsedTimeOffs.sickCount,
              [TimeOffType.CASUAL]: employeeUsedTimeOffs.casualCount,
            }[timeOff?.timeOffType ?? TimeOffType.ANNUAL]
          }
        />
        <Divider />
        <InfoRow
          loading={loading}
          label="Start Date"
          value={dayjs(timeOff?.startsAt).format("MMMM DD")}
        />
        <Divider />
        <InfoRow
          loading={loading}
          label="End Date"
          value={dayjs(timeOff?.endsAt).format("MMMM DD")}
        />

        <Divider />
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            paddingY: "24px",
          }}
        >
          <Typography variant="body2" fontWeight={600}>
            Notes
          </Typography>
          <Typography
            variant="body2"
            sx={{
              minHeight: "20px",
              whiteSpace: "pre-wrap",
              overflowWrap: "anywhere",
              fontStyle: timeOff?.notes ? "normal" : "italic",
            }}
          >
            {!loading && (timeOff?.notes || "No notes provided.")}
          </Typography>
        </Box>

        <Divider />
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            paddingY: "24px",
          }}
        >
          <Typography variant="body2" fontWeight={600}>
            Who's out between these days?
          </Typography>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            {whoIsOutList.length ? (
              whoIsOutList.map((whoIsOut) => (
                <Tooltip
                  key={whoIsOut.id}
                  sx={{
                    "& .MuiTooltip-tooltip": {
                      background: "red",
                    },
                  }}
                  title={
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "2px",
                      }}
                    >
                      <Typography variant="body2">
                        {whoIsOut.employee.firstName}{" "}
                        {whoIsOut.employee.lastName}
                      </Typography>
                      <Typography variant="caption">
                        {whoIsOut.timeOffType} Leave
                      </Typography>
                      <Typography variant="caption">
                        {dayjs(whoIsOut.startsAt).format("MMMM DD")} -{" "}
                        {dayjs(whoIsOut.endsAt).format("MMMM DD")}
                      </Typography>
                    </Box>
                  }
                  placement="top"
                >
                  <Avatar
                    alt={whoIsOut.employee.firstName}
                    sx={{
                      width: "32px",
                      height: "32px",
                    }}
                  >{whoIsOut.employee.firstName[0]}{whoIsOut.employee.lastName[0]}</Avatar>
                </Tooltip>
              ))
            ) : (
              <Typography
                variant="body2"
                sx={{
                  height: "32px",
                  fontStyle: "italic",
                }}
              >
                {loading ? "" : "No one is out between these days."}
              </Typography>
            )}
          </Box>
        </Box>
      </Box>
    </Modal>
  );
};

const InfoRow = ({
  label,
  value,
  loading,
}: { label: ReactNode; value: ReactNode; loading: boolean }) => {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        paddingY: "24px",
        height: "72px",
      }}
    >
      <Typography variant="body2">{label}</Typography>
      <Typography variant="body2">{loading ? "" : value}</Typography>
    </Box>
  );
};
