import * as React from "react"
import TitleText from "../TitleText"
import { forwardRef } from "react"
import TooltipInfo from "../TooltipInfo"
import DatePicker from "react-datepicker/dist"
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
      <div className="heading-section">
        <TitleText text={"Additional Criteria"} variant="h6" />
      </div>
      <div className="py-2">
        <div>
          <TitleText
            sx={{ fontSize: "9pt", p: 1 }}
            text="Date Range Format: mm-dd-yyyy"
            variant="body2"
          />
        </div>
        <div className="flex flex-col lg:flex-row justify-between p-4 gap-4">
          <div className="flex items-center">
            <DatePicker
              customInput={
                <CustomDatePickerInput label={"Lab Arrival From Date"} />
              }
              onChange={(val) =>
                handleOnChangeDatepicker(val, SearchAttr.LabArrivalFromDate)
              }
              startDate={formData.labArrivalFromDate}
              endDate={formData.labArrivalToDate}
              selectsStart
              dateFormat={"MM-dd-yyyy"}
              selected={formData.labArrivalFromDate}
              isClearable={true}
              showYearDropdown
              showMonthDropdown
              useShortMonthInDropdown
            />
          </div>
          <div className="flex items-center">
            <DatePicker
              customInput={
                <CustomDatePickerInput label={"Lab Arrival To Date"} />
              }
              minDate={formData.labArrivalFromDate}
              onChange={(val) =>
                handleOnChangeDatepicker(val, SearchAttr.LabArrivalToDate)
              }
              selected={formData.labArrivalToDate}
              selectsEnd
              endDate={formData.labArrivalToDate}
              dateFormat={"MM-dd-yyyy"}
              isClearable={true}
              showYearDropdown
              showMonthDropdown
              useShortMonthInDropdown
            />
            <TooltipInfo title="Lab Arrival Date Range" />
          </div>
        </div>
        <div className="flex flex-col lg:flex-row gap-4 justify-between px-4 pb-4">
          <div className="flex items-center">
            <Autocomplete
              multiple
              freeSolo                        
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
              freeSolo
              value={formData?.qcSampleType}
              getOptionKey={(option) => option.id}
              options={additionalCriteriaDrpdwns.qcSampleTypes}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              getOptionLabel={(option) => option.type || ""}
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
              freeSolo
              value={formData?.dataClassification}
              getOptionKey={(option) => option.id}
              options={additionalCriteriaDrpdwns.dataClassifications}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              getOptionLabel={(option) => option.dataClassification || ""}
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
            <Autocomplete                         
              value={formData?.sampleDepth}            
              options={additionalCriteriaDrpdwns.sampleDepths}
              isOptionEqualToValue={(option, selectedValue) => option.depth?.value === selectedValue.depth?.value}
              getOptionLabel={(option) => JSON.stringify(option?.depth?.value) || ""}            
              onChange={(e, val) =>
                handleOnChange(e, val, SearchAttr.SampleDepth)
              }
              sx={{ width: 380 }}
              renderInput={(params) => (
                <TextField {...params} label="Sample Depth (m)" />
              )}
            />

            <TooltipInfo title="Sample Depth (m)" />
          </div>
        </div>
        <div className="flex flex-col lg:flex-row gap-4 justify-between px-4 pb-4">
          <div className="flex items-center">
            <Autocomplete              
              value={formData?.units}             
              options={additionalCriteriaDrpdwns.units}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              getOptionLabel={(option) => option.customId || ""}             
              onChange={(e, val) => handleOnChange(e, val, SearchAttr.Units)}
              sx={{ width: 380 }}
              renderInput={(params) => <TextField {...params} label="Units" />}
            />

            <TooltipInfo title="Units" />
          </div>
          <div className="flex items-center">
            <TextField
              value={formData.labBatchId}
              onChange={(e) => handleOnChange(e, null, SearchAttr.LabBatchId)}
              label="Lab Batch ID"
              sx={{ width: 380 }}
            />
            <TooltipInfo title="Lab Batch ID" />
          </div>
        </div>
        <div className="flex flex-col lg:flex-row gap-4 justify-between px-4 pb-4">
          <div className="flex items-center">
          <Autocomplete
              multiple
              freeSolo
              value={formData?.specimenId}
              getOptionKey={(option) => option.id}
              options={additionalCriteriaDrpdwns.specimenIds}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              getOptionLabel={(option) => option.name || ""}
              onInputChange={(e, val) =>
                handleInputChange(e, val, SearchAttr.SpecimenId)
              }
              onChange={(e, val) => handleOnChange(e, val, SearchAttr.SpecimenId)}
              sx={{ width: 380 }}
              renderInput={(params) => <TextField {...params} label="Specimen ID" />}
            />
            <TooltipInfo title="Specimen ID" />
          </div>
        </div>
      </div>
    </div>
  )
}
