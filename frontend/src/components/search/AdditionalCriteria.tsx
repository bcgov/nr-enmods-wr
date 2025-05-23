import * as React from "react"
import TitleText from "../TitleText"
import { forwardRef } from "react"
import TooltipInfo from "../TooltipInfo"
import DatePicker from "react-datepicker/dist"
import { Autocomplete, TextField } from "@mui/material"

export interface props {}

const CustomDatePickerInput = forwardRef<HTMLInputElement, props>(
  ({ value, onClick, onChange, label }, ref) => (
    <div className="flex-row">
      <TextField
        label={label}
        sx={{ minWidth: 300 }}
        onClick={onClick}
        onChange={onChange}
        ref={ref}
        value={value}
      />
    </div>
  ),
)

export default function AdditionalCriteria(props: any) {
  const { additionalCriteriaDrpdwns } = props
  return (
    <div>
      <div className="heading-section">
        <TitleText text={"Additional Criteria"} variant="h6" />
      </div>
      <div className="py-2">
        <div>
          <TitleText
            sx={{ fontSize: "9pt", px: 1 }}
            text=" Lab Arrival Date Range Format: mm-dd-yyyy"
            variant="body2"
          />
        </div>
        <div className="flex flex-col lg:flex-row justify-between p-4 gap-4">
          <div className="flex">
            <DatePicker
              customInput={<CustomDatePickerInput label={"From"} />}
              startDate={null}
              endDate={null}
              selectsStart
              dateFormat={"MM-dd-yyyy"}
              selected={null}
              isClearable={true}
              showYearDropdown
              showMonthDropdown
              useShortMonthInDropdown
            />
          </div>
          <div className="flex ">
            <DatePicker
              customInput={<CustomDatePickerInput label={"To"} />}
              minDate={undefined}
              selected={null}
              selectsEnd
              endDate={null}
              dateFormat={"MM-dd-yyyy"}
              isClearable={true}
              showYearDropdown
              showMonthDropdown
              useShortMonthInDropdown
            />
            <TooltipInfo title="Date Range" />
          </div>
        </div>
        <div className="flex flex-col lg:flex-row gap-4 justify-between px-4 pb-4">
          <div className="flex items-center">
            <Autocomplete
              multiple
              freeSolo
              value={""}
              //getOptionKey={(option) => option.id}
              options={additionalCriteriaDrpdwns.collectionMethods}
              //  isOptionEqualToValue={(option, value) => option.id === value.id}
              // getOptionLabel={(option) => option.name || ""}
              //   onInputChange={(e, val) =>
              //     handleInputChange(e, val, BasicSearchAttr.ObservedPropertyGrp)
              //   }
              //   onChange={(e, val) =>
              //     handleOnChange(e, val, BasicSearchAttr.ObservedPropertyGrp)
              //   }
              sx={{ width: 300 }}
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
              value={""}
              // getOptionKey={(option) => option.id}
              options={additionalCriteriaDrpdwns.qcSampleTypes}
              //isOptionEqualToValue={(option, value) => option.id === value.id}
              // getOptionLabel={(option) => option.customId || ""}
              //onInputChange={(e, val) =>  handleInputChange(e, val, BasicSearchAttr.Media)}
              //onChange={(e, val) =>  handleOnChange(e, val, BasicSearchAttr.Media)   }
              sx={{ width: 300 }}
              renderInput={(params) => (
                <TextField {...params} label="QC Sample Type" />
              )}
            />
            <TooltipInfo title="Sampling Agency" />
          </div>
        </div>
        <div className="flex flex-col lg:flex-row gap-4 justify-between px-4 pb-4">
          <div className="flex items-center">
            <Autocomplete
              multiple
              freeSolo
              value={""}
              //getOptionKey={(option) => option.id}
              options={additionalCriteriaDrpdwns.collectionMethods}
              //  isOptionEqualToValue={(option, value) => option.id === value.id}
              // getOptionLabel={(option) => option.name || ""}
              //   onInputChange={(e, val) =>
              //     handleInputChange(e, val, BasicSearchAttr.ObservedPropertyGrp)
              //   }
              //   onChange={(e, val) =>
              //     handleOnChange(e, val, BasicSearchAttr.ObservedPropertyGrp)
              //   }
              sx={{ width: 300 }}
              renderInput={(params) => (
                <TextField {...params} label="Data Classification" />
              )}
            />
            <TooltipInfo title="Collection Method" />
          </div>
          <div className="flex items-center">
            <Autocomplete
              multiple
              freeSolo
              value={""}
              // getOptionKey={(option) => option.id}
              options={additionalCriteriaDrpdwns.qcSampleTypes}
              //isOptionEqualToValue={(option, value) => option.id === value.id}
              // getOptionLabel={(option) => option.customId || ""}
              //onInputChange={(e, val) =>  handleInputChange(e, val, BasicSearchAttr.Media)}
              //onChange={(e, val) =>  handleOnChange(e, val, BasicSearchAttr.Media)   }
              sx={{ width: 300 }}
              renderInput={(params) => (
                <TextField {...params} label="Sample Depth (m)" />
              )}
            />
            <TooltipInfo title="Sample Depth (m)" />
          </div>
        </div>
        <div className="flex flex-col lg:flex-row gap-4 justify-between px-4 pb-4">
          <div className="flex items-center">
            <TextField value={""} label="Units" sx={{ width: 300 }} />
            <TooltipInfo title="Units" />
          </div>
          <div className="flex items-center">
            <TextField value={""} label="Lab Batch ID" sx={{ width: 300 }} />
            <TooltipInfo title="Lab Batch ID" />
          </div>
        </div>
        <div className="flex flex-col lg:flex-row gap-4 justify-between px-4 pb-4">
          <div className="flex items-center">
            <Autocomplete
              multiple
              freeSolo
              value={""}
              // getOptionKey={(option) => option.id}
              options={additionalCriteriaDrpdwns.qcSampleTypes}
              //isOptionEqualToValue={(option, value) => option.id === value.id}
              // getOptionLabel={(option) => option.customId || ""}
              //onInputChange={(e, val) =>  handleInputChange(e, val, BasicSearchAttr.Media)}
              //onChange={(e, val) =>  handleOnChange(e, val, BasicSearchAttr.Media)   }
              sx={{ width: 300 }}
              renderInput={(params) => (
                <TextField {...params} label="Specimen ID" />
              )}
            />
            <TooltipInfo title="Sample Depth (m)" />
          </div>
        </div>
      </div>
    </div>
  )
}
