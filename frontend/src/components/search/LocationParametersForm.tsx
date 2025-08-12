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
          <TooltipInfo title="Location Type" />
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
          <TooltipInfo title="Location Name" />
        </div>
      </div>
      <div className="flex flex-col px-4 lg:flex-row gap-4 justify-between">
        <div className="flex items-center py-4">
          <Autocomplete
            multiple
            value={formData?.permitNumber}
            getOptionKey={(option) => option.id}
            options={locationDropdwns.permitNumbers}
            isOptionEqualToValue={(option, selectedValue) =>
              option.id === selectedValue.id
            }
            getOptionLabel={(option) => option.name || ""}
            onInputChange={(e, val) =>
              handleInputChange(e, val, SearchAttr.PermitNo)
            }
            onChange={(e, val) => handleOnChange(e, val, SearchAttr.PermitNo)}
            sx={{ width: 380 }}
            renderInput={(params) => (
              <TextField {...params} label="Permit ID or Location Group" />
            )}
          />
          <TooltipInfo title="Permit Number" />
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
            getOptionLabel={(option) => option?.customId || ""}
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
          <TooltipInfo title="Location ID" />
        </div>
      </div>
    </>
  )
}
