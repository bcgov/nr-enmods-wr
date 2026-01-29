import type BasicSearchFormType from "./BasicSearchFormType"

export default interface AdvanceSearchFormType extends BasicSearchFormType {
  observationIds: string[]
  observedProperty: string[]
  workedOrderNo: any[]
  samplingAgency: string[]
  analyzingAgency: string[]
  analyticalMethod: string[]
  collectionMethod: string[]
  qcSampleType: string[]
  dataClassification: string[]
  sampleDepth: string
  labBatchId: string
  specimenId: string
}
