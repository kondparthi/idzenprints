/**
 * The print bucket's count, shared between the sidebar badge and whichever
 * page just added or removed an item — so the badge updates immediately
 * instead of only on the next full page load. The bucket's actual contents
 * live on the server (see api/printBucket.ts); this context just caches the
 * count and gives any page a way to tell it something changed.
 */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { listBucket } from "@/api/printBucket";

interface PrintBucketContextValue {
  count: number;
  refresh: () => Promise<void>;
}

const PrintBucketContext = createContext<PrintBucketContextValue | undefined>(undefined);

export function PrintBucketProvider({ children }: { children: ReactNode }) {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const items = await listBucket();
      setCount(items.length);
    } catch {
      // Not logged in yet, or a transient error — the badge just stays stale.
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return <PrintBucketContext.Provider value={{ count, refresh }}>{children}</PrintBucketContext.Provider>;
}

export function usePrintBucket(): PrintBucketContextValue {
  const context = useContext(PrintBucketContext);
  if (!context) {
    throw new Error("usePrintBucket must be used within a PrintBucketProvider");
  }
  return context;
}
