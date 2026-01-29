import DatePicker from "react-datepicker"
import TitleText from "../TitleText"
import TooltipInfo from "../TooltipInfo"
import { Autocomplete, TextField } from "@mui/material"
import "react-datepicker/dist/react-datepicker.css"
import { forwardRef, useEffect, useState } from "react"
import { SearchAttr } from "@/enum/searchEnum"

export default function FilterResultsForm(props: any) {
  const {
    formData,
    handleInputChange,
    handleOnChange,
    handleOnChangeDatepicker,
    searchType,
    filterResultDrpdwns,
  } = props

  // State for Work Order Number typeahead filter
  const [workOrderInputValue, setWorkOrderInputValue] = useState("")

  interface props {
    value?: any
    onClick?: React.MouseEventHandler
    onChange?: React.ChangeEventHandler
    label: string
  }

  /**
   * Filter work order numbers based on user input
   * Searches through Redux-loaded work order numbers
   * Only filters when user has typed at least 3 characters
   */
  const getFilteredWorkOrders = () => {
    if (workOrderInputValue.length < 3) {
      return []
    }
    const query = workOrderInputValue.toLowerCase()
    return (filterResultDrpdwns.workedOrderNos || []).filter((order: any) =>
      (order.text || "").toLowerCase().includes(query),
    )
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

  return (
    <>
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
        <div className="px-2 pt-2">
          <TitleText
            variant="body2"
            sx={{ fontSize: "9pt", p: 1 }}
            text="Date Range Format: mm-dd-yyyy"
          />
        </div>
        <div className="flex flex-col lg:flex-row justify-between px-4 pb-4 gap-4">
          <div className="flex items-center" style={{ minWidth: 0 }}>
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
          <div className="flex items-center" style={{ paddingRight: 40 }}>
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
          </div>
        </div>
        <div className="flex flex-col lg:flex-row gap-4 justify-between px-4 pb-4">
          <div className="flex items-center">
            <Autocomplete
              multiple
              value={formData?.media}
              getOptionKey={(option) => option.customId}
              options={filterResultDrpdwns.mediums}
              isOptionEqualToValue={(option, value) =>
                option.customId === value.customId
              }
              getOptionLabel={(option) => option.customId || ""}
              onInputChange={(e, val) =>
                handleInputChange(e, val, SearchAttr.Media)
              }
              onChange={(e, val) => handleOnChange(e, val, SearchAttr.Media)}
              sx={{ width: 380 }}
              renderInput={(params) => <TextField {...params} label="Media" />}
            />
            <TooltipInfo title="The type of environmental media analyzed, for example, water, soils, or air." />
          </div>
          <div className="flex items-center">
            <Autocomplete
              multiple
              value={formData?.projects}
              getOptionKey={(option) => option.id}
              options={filterResultDrpdwns.projects}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              getOptionLabel={(option) => option.customId || ""}
              onInputChange={(e, val) =>
                handleInputChange(e, val, SearchAttr.Projects)
              }
              onChange={(e, val) => handleOnChange(e, val, SearchAttr.Projects)}
              sx={{ width: 380 }}
              renderInput={(params) => (
                <TextField {...params} label="Projects" />
              )}
            />
            <TooltipInfo title="The project, if applicable, that observational data was collected for." />
          </div>
        </div>

        {searchType === "advance" && (
          <>
            <div className="flex flex-col lg:flex-row gap-4 justify-between px-4 pb-4">
              <div className="flex items-center">
                <Autocomplete
                  multiple
                  value={formData?.observedProperty}
                  getOptionKey={(option) => option.id}
                  options={filterResultDrpdwns.observeredProperties}
                  isOptionEqualToValue={(option, value) =>
                    option.id === value.id
                  }
                  getOptionLabel={(option) => option.customId || ""}
                  onInputChange={(e, val) =>
                    handleInputChange(e, val, SearchAttr.ObservedProperty)
                  }
                  onChange={(e, val) =>
                    handleOnChange(e, val, SearchAttr.ObservedProperty)
                  }
                  sx={{ width: 380 }}
                  renderInput={(params) => (
                    <TextField {...params} label="Observed Property" />
                  )}
                />
                <TooltipInfo title="The name of the property that was observed or analyzed for at a lab." />
              </div>

              <div className="flex items-center">
                <Autocomplete
                  value={formData?.workedOrderNo}
                  inputValue={workOrderInputValue}
                  onInputChange={(e, val) => {
                    setWorkOrderInputValue(val)
                  }}
                  options={getFilteredWorkOrders()}
                  filterOptions={(options) => options}
                  getOptionKey={(option) => option.id}
                  isOptionEqualToValue={(option, value) =>
                    option.id === value.id
                  }
                  getOptionLabel={(option) => option.text || ""}
                  onChange={(e, val) =>
                    handleOnChange(e, val, SearchAttr.WorkedOrderNo)
                  }
                  noOptionsText={
                    workOrderInputValue.length < 3
                      ? `Type at least ${3 - workOrderInputValue.length} more characters`
                      : "No matching work orders"
                  }
                  sx={{ width: 380 }}
                  renderInput={(params) => (
                    <TextField {...params} label="Work Order Number" />
                  )}
                />
                <TooltipInfo title="A unique identifier for a set of lab analysis." />
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-4 justify-between px-4 pb-4">
              <div className="flex items-center">
                <Autocomplete
                  multiple
                  value={formData?.samplingAgency}
                  getOptionKey={(option) => option.id}
                  options={filterResultDrpdwns.samplingAgencies}
                  isOptionEqualToValue={(option, value) =>
                    option.id === value.id
                  }
                  getOptionLabel={(option) => option.customId || ""}
                  onInputChange={(e, val) =>
                    handleInputChange(e, val, SearchAttr.SamplingAgency)
                  }
                  onChange={(e, val) =>
                    handleOnChange(e, val, SearchAttr.SamplingAgency)
                  }
                  sx={{ width: 380 }}
                  renderInput={(params) => (
                    <TextField {...params} label="Sampling Agency" />
                  )}
                />
                <TooltipInfo title="The group or agency that collected the samples in the field." />
              </div>

              <div className="flex items-center">
                <Autocomplete
                  multiple
                  value={formData?.analyzingAgency}
                  getOptionKey={(option) => option.id}
                  options={filterResultDrpdwns.analyzingAgencies}
                  isOptionEqualToValue={(option, value) =>
                    option.id === value.id
                  }
                  getOptionLabel={(option) => option.name || ""}
                  onInputChange={(e, val) =>
                    handleInputChange(e, val, SearchAttr.AnalyzingAgency)
                  }
                  onChange={(e, val) =>
                    handleOnChange(e, val, SearchAttr.AnalyzingAgency)
                  }
                  sx={{ width: 380 }}
                  renderInput={(params) => (
                    <TextField {...params} label="Analyzing Agency" />
                  )}
                />
                <TooltipInfo title="The group or agency that analyzed the samples, typically a lab." />
              </div>
            </div>
          </>
        )}

        {searchType === "advance" && (
          <div className="flex flex-col lg:flex-row gap-4 justify-between px-4 pb-4">
            <div className="flex items-center">
              <Autocomplete
                multiple
                value={formData?.analyticalMethod}
                getOptionKey={(option) => option.id}
                options={filterResultDrpdwns.analyticalMethods}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                getOptionLabel={(option) => option.name || ""}
                onInputChange={(e, val) =>
                  handleInputChange(e, val, SearchAttr.AnalyticalMethod)
                }
                onChange={(e, val) =>
                  handleOnChange(e, val, SearchAttr.AnalyticalMethod)
                }
                sx={{ width: 380 }}
                renderInput={(params) => (
                  <TextField {...params} label="Analytical Method" />
                )}
              />
              <TooltipInfo title="The laboratory analytical method used to analyze a sample." />
            </div>

            <div className="flex items-center">
              <Autocomplete
                multiple
                value={formData?.analyticalMethod}
                getOptionKey={(option) => option.id}
                options={filterResultDrpdwns.analyticalMethods}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                getOptionLabel={(option) => option.id || ""}
                onInputChange={(e, val) =>
                  handleInputChange(e, val, SearchAttr.AnalyticalMethod)
                }
                onChange={(e, val) =>
                  handleOnChange(e, val, SearchAttr.AnalyticalMethod)
                }
                sx={{ width: 380 }}
                renderInput={(params) => (
                  <TextField {...params} label="Analysis Method ID" />
                )}
              />
              <TooltipInfo title="The unique system ID for the lab analysis method." />
            </div>

          </div>
        )}
      </div>
    </>
  )
}
