import { Autocomplete, TextField } from "@mui/material"
import TooltipInfo from "../TooltipInfo"
import { BasicSearchAttributes } from "@/enum/basicSearchEnum"

export default function LocationParametersForm(props: any) {
  const {
    formData,
    locationTypes,
    locationNames,
    permitNumbers,
    handleInputChange,
    handleOnChange,
  } = props

  return (
    <>
      <p>
        Specify location parameters to describe the spatial extent of the
        desired dataset. Additional options are available in the
        <a href="#"> Advance</a> fields are optional
      </p>

      <div>
        <div className="flex-row padding-y-1">
          <Autocomplete
            value={formData.locationType}
            options={locationTypes}
            isOptionEqualToValue={(option, value) =>
              option.customId === value.customId
            }
            getOptionLabel={(option) => option.customId || ""}
            onChange={(e, val) =>
              handleOnChange(e, val, BasicSearchAttributes.LocationType)
            }
            sx={{ width: 300 }}
            renderInput={(params) => (
              <TextField {...params} label="Location Types" />
            )}
          />
          <TooltipInfo title="Location Type" />
        </div>
        <div className="flex-row">
          <Autocomplete
            multiple
            value={formData.locationName}
            getOptionKey={(option) => option.id}
            options={locationNames}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            getOptionLabel={(option) => option.name || ""}
            onInputChange={(e, val) =>
              handleInputChange(e, val, BasicSearchAttributes.LocationName)
            }
            onChange={(e, val) =>
              handleOnChange(e, val, BasicSearchAttributes.LocationName)
            }
            sx={{ width: 300 }}
            renderInput={(params) => (
              <TextField {...params} label="Location Name" />
            )}
          />
          <TooltipInfo title="Location Name" />
        </div>
        <div className="flex-row padding-y-1">
          <Autocomplete
            multiple
            value={formData.permitNumber}
            getOptionKey={(option) => option.id}
            options={permitNumbers}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            getOptionLabel={(option) => option.name || ""}
            onInputChange={(e, val) =>
              handleInputChange(e, val, BasicSearchAttributes.PermitNo)
            }
            onChange={(e, val) =>
              handleOnChange(e, val, BasicSearchAttributes.PermitNo)
            }
            sx={{ width: 300 }}
            renderInput={(params) => (
              <TextField {...params} label="Permit Number" />
            )}
          />
          <TooltipInfo title="Permit Number" />
        </div>
      </div>
    </>
  )
}
