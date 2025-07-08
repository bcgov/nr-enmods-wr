import BasicSearchFormType from "./BasicSearchFormType";

export default interface AdvanceSearchFormType extends BasicSearchFormType {
   
    observationIds: string[],
    observedProperty: string[],
    workedOrderNo: any,
    samplingAgency: string[],
    analyzingAgency: string[],    
    analyticalMethod: string[],
    collectionMethod: string[],
    units: any,
    qcSampleType: string[],
    dataClassification: string[],
    sampleDepth: any,
    labBatchId: string,
    specimenId: string[],    
    labArrivalFromDate: Date | null,
    labArrivalToDate: Date | null,

}