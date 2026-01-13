export interface SearchStatistics {
  recordCount: number;
  uniqueLocations: number;
  minObservationDate: string | null;
  maxObservationDate: string | null;
}

export interface SearchJob {
  id: string;
  status: "pending" | "complete" | "error";
  filePath?: string;
  error?: string;
  statistics?: SearchStatistics;
}
export const jobs: Record<string, SearchJob> = {};
