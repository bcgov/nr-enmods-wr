import DatePicker from "react-datepicker/dist"
import TitleText from "../TitleText"
import TooltipInfo from "../TooltipInfo"
import { Autocomplete, TextField } from "@mui/material"
import "react-datepicker/dist/react-datepicker.css"
import { forwardRef } from "react"
import { BasicSearchAttributes } from "@/util/basicSearchEnum"

export default function FilterResultsForm(props: any) {
  const {
    formData,
    setDateRange,
    dateRange,
    observedProperties,
    mediums,
    handleInputChange,
    handleOnChange,
  } = props
  const [fromDate, toDate] = dateRange

  const CustomDatePickerInput = forwardRef(({ value, onClick }, ref) => (
    <TextField
      label="Date Range"
      sx={{ minWidth: 300 }}
      onClick={onClick}
      ref={ref}
      value={value}
    />
  ))

  return (
    <>
      <p>
        Specify data source, date range, and sampling filters to apply to the
        desired dataset. Additional options are available in the
        <a href="#"> Advance</a> fields are optional
      </p>

      <div>
        <TitleText
          variant="body2"
          sx={{ fontSize: "8pt" }}
          text="Date Format: mm-dd-yyyy"
        />
        <div className="flex-row padding-y-1 ">
          <DatePicker
            customInput={<CustomDatePickerInput />}
            onChange={(update) => setDateRange(update)}
            selectsRange={true}
            startDate={fromDate}
            endDate={toDate}
            dateFormat={"MM-dd-yyyy"}
            isClearable={true}
          />
          <TooltipInfo title="Date Range" />
        </div>

        <div className="flex-row">
          <Autocomplete
            multiple
            value={formData.media}
            getOptionKey={(option) => option.id}
            options={mediums}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            getOptionLabel={(option) => option.customId || ""}
            onInputChange={(e, val) =>
              handleInputChange(e, val, BasicSearchAttributes.Media)
            }
            onChange={(e, val) =>
              handleOnChange(e, val, BasicSearchAttributes.Media)
            }
            sx={{ width: 300 }}
            renderInput={(params) => <TextField {...params} label="Media" />}
          />
          <TooltipInfo title="Media" />

          {/* <TextField
            variant="outlined"
            size="small"
            name="media"
            value={formData.media}
          /> */}
        </div>

        <div className="flex-row padding-y-1">
          <Autocomplete
            multiple
            value={formData.observedPropertyGrp}
            getOptionKey={(option) => option.id}
            options={observedProperties}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            getOptionLabel={(option) => option.customId || ""}
            onInputChange={(e, val) =>
              handleInputChange(
                e,
                val,
                BasicSearchAttributes.ObservedPropertyGrp,
              )
            }
            onChange={(e, val) =>
              handleOnChange(e, val, BasicSearchAttributes.ObservedPropertyGrp)
            }
            sx={{ width: 300 }}
            renderInput={(params) => (
              <TextField {...params} label="Observed Property Group" />
            )}
          />
          <TooltipInfo title="Observed Property Group" />
        </div>
      </div>
    </>
  )
}
