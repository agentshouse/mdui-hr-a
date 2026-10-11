import { forwardRef } from "react";
import { Box, Divider, Typography } from "@mui/material";
import { DateField } from "@refinedev/mui";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { type Dayjs } from "dayjs";

export type DateRange = [Dayjs | null, Dayjs | null];
type Props = {
  value: DateRange;
  onChange: (value: DateRange) => void;
  onBlur?: () => void;
  error?: string;
  availableAnnualDays: number;
  requestedDays: number;
};

// Community calendars replace the donor's separately licensed MUI X Pro range picker.
export const InputDateStartsEnds = forwardRef<HTMLDivElement, Props>(
  ({ value, onChange, onBlur, error }, ref) => {
    const [startsAt, endsAt] = value;
    const daySlotProps = (props: { day: Dayjs }) => {
      const inRange = !!startsAt && !!endsAt && !props.day.isBefore(startsAt, "day") && !props.day.isAfter(endsAt, "day");
      return { sx: { borderRadius: "6px", ...(inRange && { bgcolor: "grey.100" }), "&.Mui-selected": { bgcolor: "grey.900", color: "white", "&:hover": { bgcolor: "grey.800" } } } };
    };
    return (
      <Box ref={ref} onBlur={onBlur} sx={{ pt: "12px", maxWidth: "628px", overflow: "hidden", border: (theme) => `1px solid ${theme.palette.divider}`, borderRadius: "12px", "& .MuiIconButton-root": { border: "none", bgcolor: "grey.100" }, "& .MuiPickersSlideTransition-root": { minHeight: "232px" }, "& .MuiDateCalendar-root": { width: "100%", maxWidth: "314px", height: "320px" } }}>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
            <Box>
              <Typography id="start-date-label" variant="caption" color="text.secondary" sx={{ display: "block", px: 3 }}>Start date</Typography>
              <DateCalendar aria-labelledby="start-date-label" value={startsAt} onChange={(date) => onChange([date, date && endsAt?.isBefore(date, "day") ? null : endsAt])} slotProps={{ day: daySlotProps }} disableHighlightToday />
            </Box>
            <Box sx={{ borderLeft: { sm: "1px solid" }, borderColor: { sm: "divider" } }}>
              <Typography id="end-date-label" variant="caption" color="text.secondary" sx={{ display: "block", px: 3 }}>End date</Typography>
              <DateCalendar aria-labelledby="end-date-label" value={endsAt} minDate={startsAt ?? undefined} referenceDate={startsAt ?? dayjs().add(1, "month")} onChange={(date) => onChange([startsAt, date])} slotProps={{ day: daySlotProps }} disableHighlightToday />
            </Box>
          </Box>
        </LocalizationProvider>
        <Divider sx={{ mx: { xs: 0, sm: "24px" }, width: { xs: "100%", sm: "calc(100% - 48px)" } }} />
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1, p: "16px 24px" }}>
          {error ? <Typography role="alert" variant="caption" color="error">{error}</Typography> : <>
            <Box><Typography variant="caption" color="text.secondary">{startsAt ? "Start Date: " : "Please select Start Date"}</Typography>{startsAt && <DateField variant="caption" value={startsAt} format="MMMM DD, YYYY" />}</Box>
            <Box><Typography variant="caption" color="text.secondary">{endsAt ? "End Date: " : "Please select End Date"}</Typography>{endsAt && <DateField variant="caption" value={endsAt} format="MMMM DD, YYYY" />}</Box>
          </>}
        </Box>
      </Box>
    );
  },
);
InputDateStartsEnds.displayName = "InputDateStartsEnds";
