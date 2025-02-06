import DatePicker from "react-datepicker/dist"
import TitleText from "../TitleText"
import TooltipInfo from "../TooltipInfo"
import { Autocomplete, TextField } from "@mui/material"
import "react-datepicker/dist/react-datepicker.css"
import { forwardRef } from "react"
import { BasicSearchAttributes } from "@/enum/basicSearchEnum"

export default function FilterResultsForm(props: any) {
  const {
    formData,
    observedProperties,
    mediums,
    projects,
    handleInputChange,
    handleOnChange,
    handleOnChangeDatepicker,
  } = props

  interface props {
    value?: any
    onClick?: React.MouseEventHandler
    onChange?: React.ChangeEventHandler
    label: string
  }

  const CustomDatePickerInput = forwardRef<HTMLInputElement, props>(
    ({ value, onClick, onChange, label }, ref) => (
      <TextField
        label={label}
        sx={{ minWidth: 300 }}
        onClick={onClick}
        onChange={onChange}
        ref={ref}
        value={value}
      />
    ),
  )

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
          text="Date Range Format: mm-dd-yyyy"
        />
        <div className="flex-row padding-y-1 ">
          <DatePicker
            customInput={<CustomDatePickerInput label={"From"} />}
            onChange={(val) =>
              handleOnChangeDatepicker(val, BasicSearchAttributes.FromDate)
            }
            startDate={formData.fromDate}
            endDate={formData.toDate}
            selectsStart
            dateFormat={"MM-dd-yyyy"}
            selected={formData.fromDate}
            isClearable={true}
            showYearDropdown
            showMonthDropdown
            useShortMonthInDropdown
          />
          <DatePicker
            customInput={<CustomDatePickerInput label={"To"} />}
            minDate={formData.fromDate}
            onChange={(val) =>
              handleOnChangeDatepicker(val, BasicSearchAttributes.ToDate)
            }
            selected={formData.toDate}
            selectsEnd
            endDate={formData.toDate}
            dateFormat={"MM-dd-yyyy"}
            isClearable={true}
            showYearDropdown
            showMonthDropdown
            useShortMonthInDropdown
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
            getOptionLabel={(option) => option.name || ""}
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
        <div className="flex-row">
          <Autocomplete
            multiple
            value={formData.projects}
            getOptionKey={(option) => option.id}
            options={projects}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            getOptionLabel={(option) => option.name || ""}
            onInputChange={(e, val) =>
              handleInputChange(e, val, BasicSearchAttributes.Projects)
            }
            onChange={(e, val) =>
              handleOnChange(e, val, BasicSearchAttributes.Projects)
            }
            sx={{ width: 300 }}
            renderInput={(params) => <TextField {...params} label="Projects" />}
          />
          <TooltipInfo title="Projects" />
        </div>
      </div>
    </>
  )
}
