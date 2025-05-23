import DatePicker from "react-datepicker/dist"
import TitleText from "../TitleText"
import TooltipInfo from "../TooltipInfo"
import { Autocomplete, TextField } from "@mui/material"
import "react-datepicker/dist/react-datepicker.css"
import { forwardRef } from "react"
import { SearchAttr } from "@/enum/searchEnum"

export default function FilterResultsForm(props: any) {
  const {
    formData,
    handleInputChange,
    handleOnChange,
    handleOnChangeDatepicker,
    searchType,
    filterResultDrpdwns

  } = props

  interface props {
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
          sx={{ minWidth: 300 }}
          onClick={onClick}
          onChange={onChange}
          ref={ref}
          value={value}
        />
      </div>
    ),
  )

  return (
    <>
      <div>
        <div className="heading-section">
          <TitleText text={"Filter Results"} variant="h6" />
        </div>
        <div className="py-2">
          <TitleText
            text={
              "Specify data source, date range, and sampling filters to apply to the desired dataset."
            }
            variant="body2"
            sx={{ fontWeight: 500, px: 1 }}
          />
        </div>
        <div>
          <div className="p-1">
            <TitleText
              variant="body2"
              sx={{ fontSize: "9pt", px: 1 }}
              text="Date Range Format: mm-dd-yyyy"
            />
          </div>
          <div className="flex flex-col lg:flex-row justify-between p-4 gap-4">
            <div className="flex">
              <DatePicker
                customInput={<CustomDatePickerInput label={"From"} />}
                onChange={(val) =>
                  handleOnChangeDatepicker(val, SearchAttr.FromDate)
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
            </div>
            <div className="flex ">
              <DatePicker
                customInput={<CustomDatePickerInput label={"To"} />}
                minDate={formData.fromDate}
                onChange={(val) =>
                  handleOnChangeDatepicker(val, SearchAttr.ToDate)
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
          </div>
          <div className="flex flex-col lg:flex-row gap-4 justify-between px-4 pb-4">
            <div className="flex items-center">
              <Autocomplete
                multiple
                freeSolo
                value={formData?.media}
                getOptionKey={(option) => option.id}
                options={filterResultDrpdwns.mediums}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                getOptionLabel={(option) => option.customId || ""}
                onInputChange={(e, val) =>
                  handleInputChange(e, val, SearchAttr.Media)
                }
                onChange={(e, val) =>
                  handleOnChange(e, val, SearchAttr.Media)
                }
                sx={{ width: 300 }}
                renderInput={(params) => (
                  <TextField {...params} label="Media" />
                )}
              />
              <TooltipInfo title="Media" />
            </div>
            <div className="flex items-center">
              <Autocomplete
                multiple
                freeSolo
                value={formData?.observedPropertyGrp}
                getOptionKey={(option) => option.id}
                options={filterResultDrpdwns.observedPropGroups}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                getOptionLabel={(option) => option.name || ""}
                onInputChange={(e, val) =>
                  handleInputChange(e, val, SearchAttr.ObservedPropertyGrp)
                }
                onChange={(e, val) =>
                  handleOnChange(e, val, SearchAttr.ObservedPropertyGrp)
                }
                sx={{ width: 300 }}
                renderInput={(params) => (
                  <TextField {...params} label="Observed Property Group" />
                )}
              />
              <TooltipInfo title="Observed Property Group" />
            </div>
          </div>

          {searchType==="advance" && (
            <>
            <div className="flex flex-col lg:flex-row gap-4 justify-between px-4 pb-4">
            <div className="flex items-center">
              <Autocomplete
                multiple
                freeSolo
                value={formData?.media}
                getOptionKey={(option) => option.id}
                options={filterResultDrpdwns.mediums}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                getOptionLabel={(option) => option.customId || ""}
                onInputChange={(e, val) =>
                  handleInputChange(e, val, SearchAttr.Media)
                }
                onChange={(e, val) =>
                  handleOnChange(e, val, SearchAttr.Media)
                }
                sx={{ width: 300 }}
                renderInput={(params) => (
                  <TextField {...params} label="Observed Property" />
                )}
              />
              <TooltipInfo title="Observed Property" />
            </div>

            <div className="flex items-center">
              <Autocomplete
                multiple
                freeSolo
                value={formData?.observedPropertyGrp}
                getOptionKey={(option) => option.id}
                options={""}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                getOptionLabel={(option) => option.name || ""}
                onInputChange={(e, val) =>
                  handleInputChange(e, val, SearchAttr.ObservedPropertyGrp)
                }
                onChange={(e, val) =>
                  handleOnChange(e, val, SearchAttr.ObservedPropertyGrp)
                }
                sx={{ width: 300 }}
                renderInput={(params) => (
                  <TextField {...params} label="Worked Order Number" />
                )}
              />
              <TooltipInfo title="Worked Order Number" />
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-4 justify-between px-4 pb-4">
            <div className="flex items-center">
              <Autocomplete
                multiple
                freeSolo
                value={formData?.media}
                getOptionKey={(option) => option.id}
                options={filterResultDrpdwns.mediums}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                getOptionLabel={(option) => option.customId || ""}
                onInputChange={(e, val) =>
                  handleInputChange(e, val, SearchAttr.Media)
                }
                onChange={(e, val) =>
                  handleOnChange(e, val, SearchAttr.Media)
                }
                sx={{ width: 300 }}
                renderInput={(params) => (
                  <TextField {...params} label="Sampling Agency" />
                )}
              />
              <TooltipInfo title="Sampling Agency" />
            </div>

            <div className="flex items-center">
              <Autocomplete
                multiple
                freeSolo
                value={formData?.observedPropertyGrp}
                getOptionKey={(option) => option.id}
                options={filterResultDrpdwns.observedProperties}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                getOptionLabel={(option) => option.name || ""}
                onInputChange={(e, val) =>
                  handleInputChange(e, val, SearchAttr.ObservedPropertyGrp)
                }
                onChange={(e, val) =>
                  handleOnChange(e, val, SearchAttr.ObservedPropertyGrp)
                }
                sx={{ width: 300 }}
                renderInput={(params) => (
                  <TextField {...params} label="Analyzing Agency" />
                )}
              />
              <TooltipInfo title="Analyzing Agency" />
            </div>
          </div>
          </>
          )}

          
          <div className="flex flex-col lg:flex-row gap-4 justify-between px-4 pb-4">
            <div className="flex flex-row">
              <Autocomplete
                multiple
                freeSolo
                value={formData?.projects}
                getOptionKey={(option) => option.id}
                options={filterResultDrpdwns.projects}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                getOptionLabel={(option) => option.customId || ""}
                onInputChange={(e, val) =>
                  handleInputChange(e, val, SearchAttr.Projects)
                }
                onChange={(e, val) =>
                  handleOnChange(e, val, SearchAttr.Projects)
                }
                sx={{ width: 300 }}
                renderInput={(params) => (
                  <TextField {...params} label="Projects" />
                )}
              />
              <TooltipInfo title="Projects" />
            </div>

            {searchType==="advance" && (
              <div className="flex items-center">
              <Autocomplete
                multiple
                freeSolo
                value={formData?.observedPropertyGrp}
                getOptionKey={(option) => option.id}
                options={filterResultDrpdwns.observedProperties}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                getOptionLabel={(option) => option.name || ""}
                onInputChange={(e, val) =>
                  handleInputChange(e, val, SearchAttr.ObservedPropertyGrp)
                }
                onChange={(e, val) =>
                  handleOnChange(e, val, SearchAttr.ObservedPropertyGrp)
                }
                sx={{ width: 300 }}
                renderInput={(params) => (
                  <TextField {...params} label="Analytical Method" />
                )}
              />
              <TooltipInfo title="Analytical Method" />
            </div>
            )}

            
          </div>
        </div>
      </div>
    </>
  )
}
