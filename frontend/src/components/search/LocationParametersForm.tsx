import { Autocomplete, TextField } from "@mui/material"
import TooltipInfo from "../TooltipInfo"
import { BasicSearchAttr } from "@/enum/basicSearchEnum"
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
        <div className="flex flex-col px-4 lg:flex-row gap-4 justify-between">
          <div className="flex items-center">
            <Autocomplete
              value={formData?.locationType}
              options={locationTypes}
              isOptionEqualToValue={(option, value) =>
                option.customId === value.customId
              }
              getOptionLabel={(option) => option.customId || ""}
              onChange={(e, val) =>
                handleOnChange(e, val, BasicSearchAttr.LocationType)
              }
              sx={{ width: 300 }}
              renderInput={(params) => (
                <TextField {...params} label="Location Types" />
              )}
            />
            <TooltipInfo title="Location Type" />
          </div>
          <div className="flex items-center">
            <Autocomplete
              multiple
              freeSolo
              value={formData?.locationName || null}
              getOptionKey={(option) => option.id}
              options={locationNames}
              isOptionEqualToValue={(option, selectedValue) =>
                option.id === selectedValue.id
              }
              getOptionLabel={(option) => option.name || ""}
              onInputChange={(e, val) =>
                handleInputChange(e, val, BasicSearchAttr.LocationName)
              }
              onChange={(e, val) =>
                handleOnChange(e, val, BasicSearchAttr.LocationName)
              }
              sx={{ width: 300 }}
              renderInput={(params) => (
                <TextField {...params} label="Location Name" />
              )}
            />
            <TooltipInfo title="Location Name" />
          </div>
        </div>
        <div className="flex items-center p-4">
          <Autocomplete
            multiple
            freeSolo
            value={formData?.permitNumber}
            getOptionKey={(option) => option.id}
            options={permitNumbers}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            getOptionLabel={(option) => option.name || ""}
            onInputChange={(e, val) =>
              handleInputChange(e, val, BasicSearchAttr.PermitNo)
            }
            onChange={(e, val) =>
              handleOnChange(e, val, BasicSearchAttr.PermitNo)
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
