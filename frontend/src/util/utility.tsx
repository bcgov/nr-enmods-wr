// export const getArrIndex = (arr: any, id: string | number) => {
//   arr.forEach((item: any, index: number) => {
//     if (item.id === id) return index
//   })

//   return -1
// }

export const extractFileName = (contentDisposition: string): string => {
  const regex = /filename="?([^"]+)"?/
  const match = contentDisposition ? contentDisposition.match(regex) : null
  return match ? match[1] : ""
}

export const API_VERSION = "v1"
