import { createContext, useContext } from "react";
import type { DataProvider } from "@refinedev/core";
import type { QueryClient } from "@tanstack/react-query";
import type { HouseRoom, Database } from "./house";
import type { Employee } from "./types";
export type HRContextValue = {
  dataProvider: DataProvider;
  queryClient: QueryClient;
  employee: Employee | null;
  employees: Employee[];
  setEmployeeId: (id: string) => void;
  room: HouseRoom;
  database?: Database;
};
export const HRContext = createContext<HRContextValue | null>(null);
export const useHRContext = () => {
  const value = useContext(HRContext);
  if (!value) throw new Error("HR needs a selected House Room.");
  return value;
};
