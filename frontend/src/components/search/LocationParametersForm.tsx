import { Autocomplete, TextField } from "@mui/material"
import TooltipInfo from "../TooltipInfo"
import { SearchAttr } from "@/enum/searchEnum"
import TitleText from "../TitleText"

export default function LocationParametersForm(props: any) {
  const { formData, handleInputChange, handleOnChange, locationDropdwns } =
    props
  return (
    <>
      <div className="pt-1 pb-3">
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
            options={locationDropdwns?.locationTypes}
            isOptionEqualToValue={(option, selectedValue) =>
              option.customId === selectedValue.customId
            }
            getOptionLabel={(option) => option?.customId || ""}
            onChange={(e, val) =>
              handleOnChange(e, val, SearchAttr.LocationType)
            }
            sx={{ width: 380 }}
            renderInput={(params) => (
              <TextField {...params} label="Location Types" />
            )}
          />
          <TooltipInfo title="Describes the type of sampling location, such as a lake, river, or air quality monitoring site." />
        </div>

        <div className="flex items-center">
          <Autocomplete
            multiple
            value={formData?.locationName || null}
            getOptionKey={(option) => option.id}
            options={locationDropdwns.locationNames}
            isOptionEqualToValue={(option, selectedValue) =>
              option.id === selectedValue.id
            }
            getOptionLabel={(option) => option?.name || ""}
            onInputChange={(e, val) =>
              handleInputChange(e, val, SearchAttr.LocationName)
            }
            onChange={(e, val) =>
              handleOnChange(e, val, SearchAttr.LocationName)
            }
            sx={{ width: 380 }}
            renderInput={(params) => (
              <TextField {...params} label="Location Name" />
            )}
          />
          <TooltipInfo title="The name of the sampling location." />
        </div>
      </div>
      <div className="flex flex-col px-4 lg:flex-row gap-4 justify-between">
        <div className="flex items-center py-4">
          <Autocomplete
            multiple
            value={formData?.permitNumber || null}
            getOptionKey={(option) => option.name}
            options={locationDropdwns.permitNumbers}
            isOptionEqualToValue={(option, selectedValue) =>
              option.name === selectedValue.name
            }
            getOptionLabel={(option) => option?.name || ""}
            onInputChange={(e, val) =>
              handleInputChange(e, val, SearchAttr.PermitNo)
            }
            onChange={(e, val) =>
              handleOnChange(e, val, SearchAttr.PermitNo)
            }
            sx={{ width: 380 }}
            renderInput={(params) => (
              <TextField {...params} label="Permit ID or Location Group" />
            )}
          />
          <TooltipInfo title="An authorization number from the authorization management system or a location group ID." />
        </div>

        <div className="flex items-center">
          <Autocomplete
            multiple
            value={formData?.locationName || null}
            getOptionKey={(option) => option.id}
            options={locationDropdwns.locationNames}
            isOptionEqualToValue={(option, selectedValue) =>
              option.id === selectedValue.id
            }
            getOptionLabel={(option) => option?.id || ""}
            onInputChange={(e, val) =>
              handleInputChange(e, val, SearchAttr.LocationName)
            }
            onChange={(e, val) =>
              handleOnChange(e, val, SearchAttr.LocationName)
            }
            sx={{ width: 380 }}
            renderInput={(params) => (
              <TextField {...params} label="Location ID" />
            )}
          />
          <TooltipInfo title="The sampling locations unique alpha numeric ID." />
        </div>
      </div>
    </>
  )
}
