export interface SearchJob {
  id: string;
  status: "pending" | "complete" | "error";
  filePath?: string;
  error?: string;
}
export const jobs: Record<string, SearchJob> = {};
