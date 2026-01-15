export default interface BasicSearchFormType {
  locationType: any | null
  locationName: string[]
  permitNumber: string[]
  fromDate: Date | null
  toDate: Date | null
  media: string[]
  projects: string[]
  fileFormat?: null
}
