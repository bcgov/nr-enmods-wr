export interface SearchStatistics {
  recordCount: number;
  uniqueLocations: number;
  minObservationDate: string | null;
  maxObservationDate: string | null;
}

export interface SearchJob {
  id: string;
  status: "pending" | "complete" | "error";
  fileName?: string; // Just the filename, not full path
  createdAt: number; // Timestamp for cleanup
  error?: string;
  statistics?: SearchStatistics;
}
export const jobs: Record<string, SearchJob> = {};
