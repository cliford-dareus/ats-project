import {
  useRouter,
  usePathname,
  useSearchParams,
} from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { createNewSearchParam } from "@/lib/utils";
import { SidebarInput } from "../ui/sidebar";

const AppSidebarSearch = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const debouncedLocation = useDebounce(searchTerm.trim(), 600);

  // Create query string helper
  const createQueryString = useCallback(
    (params: Record<string, string[] | string | number | null>) => {
      return createNewSearchParam(params, searchParams);
      },
      [searchParams]
  );

  useEffect(() => {
      if (searchParams.get("search") ?? "" !== debouncedLocation) {
          startTransition(() => {
              const newQuery = createQueryString({
                  search: debouncedLocation || null,
              });
              router.push(`${pathname}?${newQuery}`, {scroll: false});
          });
      }
  }, [debouncedLocation, searchParams, createQueryString, router, pathname]);

  useEffect(() => {
      setSearchTerm('');
  }, [pathname]);

  return (
    <SidebarInput value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Type to search..."/>
  );
};

export default AppSidebarSearch;
