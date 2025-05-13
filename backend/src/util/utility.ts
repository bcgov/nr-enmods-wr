export function extractFileName(contentDisposition: string): string {
  const regex = /filename="?([^"]+)"?/;
  const match = contentDisposition ? contentDisposition.match(regex) : null;
  return match ? match[1] : "";
}

export function sortArr(arr: any, sortBy: string) {
  if (sortBy) {
    arr.sort((a: any, b: any) => {
      if (a[sortBy] < b[sortBy]) return -1;
      if (a[sortBy] > b[sortBy]) return 1;
      return 0;
    });
  }
}
