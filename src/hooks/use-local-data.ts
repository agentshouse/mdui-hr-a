import {useContext} from "react";
import {useParams} from "react-router";
import {useList, useInfiniteList, useShow, type BaseRecord} from "@refinedev/core";
import {HRContext} from "../house-context";
import {readLocalRows} from "../house";

/** Refine's donor components read the observed Room snapshot without route loading. */
export function useLocalList<T extends BaseRecord = BaseRecord>(options: any) {
  const database = useContext(HRContext)?.database;
  const fallback = useList<T>({...options, queryOptions: {...options.queryOptions, enabled: !database && options.queryOptions?.enabled !== false}});
  if (!database) return fallback;
  const result = readLocalRows(database, options.resource, options);
  return {...fallback, result, query: {...fallback.query, isLoading: false, isFetching: false, error: null}} as typeof fallback;
}
export function useLocalInfiniteList<T extends BaseRecord = BaseRecord>(options: any) {
  const database = useContext(HRContext)?.database;
  const fallback = useInfiniteList<T>({...options, queryOptions: {...options.queryOptions, enabled: !database && options.queryOptions?.enabled !== false}});
  if (!database) return fallback;
  const result = readLocalRows(database, options.resource, {...options, pagination: {mode: "off"}});
  const data = {pages: [result], pageParams: [1]};
  return {...fallback, result: {...fallback.result, data, hasNextPage: false}, query: {...fallback.query, data, isLoading: false, isFetching: false, error: null, fetchNextPage: async () => undefined}} as unknown as typeof fallback;
}
export function useLocalShow<T extends BaseRecord = BaseRecord>(options: any) {
  const database = useContext(HRContext)?.database;
  const params = useParams();
  const fallback = useShow<T>({...options, queryOptions: {...options.queryOptions, enabled: !database && options.queryOptions?.enabled !== false}});
  if (!database) return fallback;
  const result = readLocalRows(database, options.resource ?? "time-offs", {...options, pagination: {mode: "off"}});
  const data = result.data.find(row => row.id === (options.id ?? params.id));
  return {...fallback, query: {...fallback.query, data: data ? {data} : undefined, isLoading: false, isFetching: false, error: data ? null : new Error("This request is no longer in the Room.")}} as typeof fallback;
}
