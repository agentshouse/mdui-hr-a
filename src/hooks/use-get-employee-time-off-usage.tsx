import {useLocalList} from "@/hooks/use-local-data";
import { type TimeOff, TimeOffStatus, TimeOffType } from "@/types";
import { useMemo } from "react";
import dayjs from "dayjs";
import { leaveDaysInYear } from "@/utilities/leave-days";

export const useGetEmployeeTimeOffUsage = ({
  employeeId,
  year = dayjs().year(),
}: { employeeId?: string; year?: number }) => {
  const { result, query } = useLocalList<TimeOff>({
    resource: "time-offs",
    pagination: { mode: "off" },
    filters: [
      { field: "status", operator: "eq", value: TimeOffStatus.APPROVED },
      { field: "employeeId", operator: "eq", value: employeeId },
    ],
    queryOptions: { enabled: !!employeeId },
  });
  const data = result?.data;

  const { sick, casual, annual, sickCount, casualCount, annualCount } =
    useMemo(() => {
      const sick: TimeOff[] = [];
      const casual: TimeOff[] = [];
      const annual: TimeOff[] = [];
      let sickCount = 0;
      let casualCount = 0;
      let annualCount = 0;

      data?.forEach((timeOff) => {
        const duration = leaveDaysInYear(timeOff.startsAt, timeOff.endsAt, year);
        if (!duration) return;

        if (timeOff.timeOffType === TimeOffType.SICK) {
          sick.push(timeOff);
          sickCount += duration;
        } else if (timeOff.timeOffType === TimeOffType.CASUAL) {
          casual.push(timeOff);
          casualCount += duration;
        } else if (timeOff.timeOffType === TimeOffType.ANNUAL) {
          annual.push(timeOff);
          annualCount += duration;
        }
      });

      return {
        sick,
        casual,
        annual,
        sickCount,
        casualCount,
        annualCount,
      };
    }, [data, year]);

  return {
    query,
    sick,
    casual,
    annual,
    sickCount,
    casualCount,
    annualCount,
  };
};
