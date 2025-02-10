import { Autocomplete, TextField } from "@mui/material"
import TooltipInfo from "../TooltipInfo"
import { BasicSearchAttributes } from "@/enum/basicSearchEnum"
import TitleText from "../TitleText"

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
      <div>
        <div className="heading-section">
          <TitleText text={"Location Parameters"} variant="h6" />
        </div>
        <div className="py-2">
          <TitleText
            text={
              "Specify location parameters to describe the spatial extent of the desired dataset."
            }
            variant="body2"
            sx={{ fontWeight: 500, p: 1 }}
          />
        </div>
        <div className="flex flex-col sm:flex-row justify-between px-4">
          <div className="flex flex-row py-4">
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
          <div className="flex flex-row">
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
        </div>
        <div className="flex flex-row p-4">
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
