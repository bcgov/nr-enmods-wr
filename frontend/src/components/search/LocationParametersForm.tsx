import { TextField } from "@mui/material"
import TooltipInfo from "../TooltipInfo"
import TitleText from "../TitleText"

export default function LocationParametersForm(props: any) {
  const { formData, handleOnChange } = props

  return (
    <>
      <p>
        Specify location parameters to describe the spatial extent of the
        desired dataset. Additional options are available in the
        <a href="#"> Advance</a> fields are optional
      </p>

      <div>
        <div className="flex-row">
          <TitleText
            variant="subtitle1"
            text="Location Type"
            sx={{ fontWeight: 600 }}
          />
          <TooltipInfo title="Location Type" />
        </div>
        <div>
          <TextField
            variant="outlined"
            size="small"
            name="locationType"
            value={formData.locationType}
            onChange={handleOnChange}
          />
        </div>
        <div className="flex-row">
          <TitleText
            variant="subtitle1"
            text="Location Name"
            sx={{ fontWeight: 600 }}
          />
          <TooltipInfo title="Location Name" />
        </div>
        <div>
          <TextField
            variant="outlined"
            size="small"
            name="locationName"
            value={formData.locationName}
            onChange={handleOnChange}
          />
        </div>
        <div className="flex-row">
          <TitleText
            variant="subtitle1"
            text="Permit Number"
            sx={{ fontWeight: 600 }}
          />
          <TooltipInfo title="Permit Number" />
        </div>
        <div>
          <TextField
            variant="outlined"
            size="small"
            name="permitNumber"
            value={formData.permitNumber}
            onChange={handleOnChange}
          />
        </div>
      </div>
    </>
  )
}
