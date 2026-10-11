import {useLocalShow} from "@/hooks/use-local-data";
import { useGo, } from "@refinedev/core";
import { TimeOffRequestModal } from "@/components/requests/time-off-request-modal";
import type { Employee, TimeOff } from "@/types";

export const PageManagerRequestsTimeOffsEdit = () => {
  const go = useGo();

  const { query: timeOffRequestQuery } = useLocalShow<
    TimeOff & { employee: Employee }
  >({
    meta: {
      join: ["employee"],
    },
  });

  const loading = timeOffRequestQuery.isLoading;

  return (
    <TimeOffRequestModal
      open
      loading={loading}
      error={timeOffRequestQuery.error?.message}
      timeOff={timeOffRequestQuery?.data?.data}
      onClose={() =>
        go({
          to: {
            resource: "requests",
            action: "list",
          },
        })
      }
      onSuccess={() => {
        go({
          to: {
            resource: "requests",
            action: "list",
          },
        });
      }}
    />
  );
};
