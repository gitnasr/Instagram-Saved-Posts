"use client";

import { useQuery } from "@tanstack/react-query";
import {
  serializeAccountFilters,
  type AccountFilters,
} from "@/lib/account-filter-params";
import type { FilterOption } from "@/lib/filter-registry";

type FacetResponse = { facets: Record<string, FilterOption[]> };

/**
 * Distinct values (with counts) for the columns whose options are discovered
 * from the data. Counts reflect the other active filters, so they shrink as
 * the user narrows.
 */
export function useAccountFacets(filters: AccountFilters) {
  return useQuery({
    queryKey: ["account-facets", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      serializeAccountFilters(filters, params);
      const res = await fetch(`/api/accounts/facets?${params}`);
      if (!res.ok) throw new Error("Failed to fetch filter options");
      const body: FacetResponse = await res.json();
      return body.facets;
    },
    staleTime: 60_000,
  });
}
