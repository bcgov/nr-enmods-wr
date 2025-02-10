export const extractFileName = (contentDisposition: string): string => {
  const regex = /filename="?([^"]+)"?/
  const match = contentDisposition ? contentDisposition.match(regex) : null
  return match ? match[1] : ""
}

export const API_VERSION = "v1"
