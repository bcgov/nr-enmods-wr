import * as React from "react"
import TitleText from "../TitleText"
import { forwardRef } from "react"
import TooltipInfo from "../TooltipInfo"
import { Autocomplete, TextField } from "@mui/material"
import { SearchAttr } from "@/enum/searchEnum"

export interface props {
  value?: any
  onClick?: React.MouseEventHandler
  onChange?: React.ChangeEventHandler
  label: string
}

const CustomDatePickerInput = forwardRef<HTMLInputElement, props>(
  ({ value, onClick, onChange, label }, ref) => (
    <div className="flex-row">
      <TextField
        label={label}
        sx={{ minWidth: 380 }}
        onClick={onClick}
        onChange={onChange}
        ref={ref}
        value={value}
      />
    </div>
  ),
)

export default function AdditionalCriteria(props: any) {
  const {
    additionalCriteriaDrpdwns,
    formData,
    handleInputChange,
    handleOnChange,
    handleOnChangeDatepicker,
  } = props

  return (
    <div>
     
      <div className="py-4">        
        <div className="flex flex-col lg:flex-row gap-4 justify-between px-4 pb-4">
          <div className="flex items-center">
            <Autocomplete
              multiple
              
              value={formData?.collectionMethod}
              getOptionKey={(option) => option.id}
              options={additionalCriteriaDrpdwns.collectionMethods}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              getOptionLabel={(option) => option.customId || ""}
              onInputChange={(e, val) =>
                handleInputChange(e, val, SearchAttr.CollectionMethod)
              }
              onChange={(e, val) =>
                handleOnChange(e, val, SearchAttr.CollectionMethod)
              }
              sx={{ width: 380 }}
              renderInput={(params) => (
                <TextField {...params} label="Collection Method" />
              )}
            />
            <TooltipInfo title="Collection Method" />
          </div>
          <div className="flex items-center">
            <Autocomplete
              multiple
             
              value={formData?.qcSampleType}
              getOptionKey={(option) => option.id}
              options={additionalCriteriaDrpdwns.qcSampleTypes}
              isOptionEqualToValue={(option, value) => option === value}
              getOptionLabel={(option) => option.qc_type || ""}
              onInputChange={(e, val) =>
                handleInputChange(e, val, SearchAttr.QcSampleType)
              }
              onChange={(e, val) =>
                handleOnChange(e, val, SearchAttr.QcSampleType)
              }
              sx={{ width: 380 }}
              renderInput={(params) => (
                <TextField {...params} label="QC Sample Type" />
              )}
            />

            <TooltipInfo title="QC Sample Type" />
          </div>
        </div>
        <div className="flex flex-col lg:flex-row gap-4 justify-between px-4 pb-4">
          <div className="flex items-center">
            <Autocomplete
              multiple
              
              value={formData?.dataClassification}
              getOptionKey={(option) => option.id}
              options={additionalCriteriaDrpdwns.dataClassifications}
              isOptionEqualToValue={(option, value) => option === value}
              getOptionLabel={(option) => option.data_classification || ""}
              onInputChange={(e, val) =>
                handleInputChange(e, val, SearchAttr.DataClassification)
              }
              onChange={(e, val) =>
                handleOnChange(e, val, SearchAttr.DataClassification)
              }
              sx={{ width: 380 }}
              renderInput={(params) => (
                <TextField {...params} label="Data Classification" />
              )}
            />

            <TooltipInfo title="Data Classification" />
          </div>
          <div className="flex items-center">
            <TextField
              value={formData.sampleDepth}
              onChange={(e) => handleOnChange(e, null, SearchAttr.SampleDepth)}
              label="Sample Depth"
              sx={{ width: 380 }}
            />
            <TooltipInfo title="Sample Depth" />
          </div>
        </div>
        <div className="flex flex-col lg:flex-row gap-4 justify-between px-4 pb-4">
          <div className="flex items-center">
            <TextField
              value={formData.labBatchId}
              onChange={(e) => handleOnChange(e, null, SearchAttr.LabBatchId)}
              label="Lab Batch ID"
              sx={{ width: 380 }}
            />
            <TooltipInfo title="Lab Batch ID" />
          </div>
          <div className="flex items-center">
            <TextField
              value={formData.specimenId}
              onChange={(e) => handleOnChange(e, null, SearchAttr.SpecimenId)}
              label="Specimen ID"
              sx={{ width: 380 }}
            />
            <TooltipInfo title="Specimen ID" />
          </div>
        </div>
        
      </div>
    </div>
  )
}
