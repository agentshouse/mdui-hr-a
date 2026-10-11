import { ErrorComponent, Refine } from "@refinedev/core";
import routerProvider, { DocumentTitleHandler, NavigateToResource } from "@refinedev/react-router";
import { HashRouter, Routes, Route, Outlet, useLocation } from "react-router";
import { Toaster } from "react-hot-toast";
import { PageEmployeeTimeOffsList } from "@/pages/employee/time-offs/list";
import { PageEmployeeTimeOffsCreate } from "@/pages/employee/time-offs/create";
import { PageManagerRequestsList } from "@/pages/manager/requests/list";
import { PageManagerRequestsTimeOffsEdit } from "@/pages/manager/requests/time-offs/edit";
import { Layout } from "@/components/layout";
import { ThemeProvider } from "@/providers/theme-provider";
import { useNotificationProvider } from "@/providers/notification-provider";
import { useHRContext } from "@/house-context";
import { RequestsIcon, TimeOffIcon } from "@/icons";
import "@/utilities/init-dayjs";

const RouteLayout = () => {
  const { pathname } = useLocation();
  return <ThemeProvider variant={pathname.startsWith("/manager/requests") ? "requests" : "time-off"}><Layout><Outlet /></Layout></ThemeProvider>;
};

const App: React.FC = () => {
  const { dataProvider, queryClient, room, employee } = useHRContext();
  return (
    <HashRouter>
      <ThemeProvider>
        <Refine
          key={room.locator}
          routerProvider={routerProvider}
          dataProvider={dataProvider}
          notificationProvider={useNotificationProvider}
          resources={[
            { name: "time-offs", list: "/employee/time-offs", create: "/employee/time-offs/new", meta: { label: "Time Off", icon: <TimeOffIcon /> } },
            { name: "time-offs", identifier: "requests", list: "/manager/requests", edit: "/manager/requests/:id/edit", meta: { label: "Requests", icon: <RequestsIcon /> } },
          ]}
          options={{ reactQuery: { clientConfig: queryClient }, syncWithLocation: true, warnWhenUnsavedChanges: false, disableTelemetry: true }}
        >
          <Routes>
            <Route element={<RouteLayout />}>
              <Route index element={<NavigateToResource resource="time-offs" />} />
              <Route path="employee/time-offs" element={<PageEmployeeTimeOffsList />} />
              <Route path="employee/time-offs/new" element={<PageEmployeeTimeOffsCreate key={employee?.id} />} />
              <Route path="manager/requests" element={<PageManagerRequestsList><Outlet /></PageManagerRequestsList>}>
                <Route path=":id/edit" element={<PageManagerRequestsTimeOffsEdit />} />
              </Route>
              <Route path="*" element={<ErrorComponent />} />
            </Route>
          </Routes>
          <DocumentTitleHandler handler={({ resource }) => `${resource?.meta?.label ?? "Time Off"} · Workforce`} />
          <Toaster position="bottom-right" reverseOrder={false} />
        </Refine>
      </ThemeProvider>
    </HashRouter>
  );
};
export default App;
