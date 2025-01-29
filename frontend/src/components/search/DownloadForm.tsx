import { FormControl, FormControlLabel, Radio, RadioGroup } from "@mui/material"
import TitleText from "../TitleText"
import TooltipInfo from "../TooltipInfo"

export default function DownloadForm(props: any) {
  const { formData, handleOnChange } = props

  return (
    <>
      <p>
        Specify a data type and file format to download. Additional options are
        available in the
        <a href="#"> Advance</a> fields are optional
      </p>

      <div>
        <div className="flex-row">
          <TitleText variant="subtitle1" text="File Format" />
          <TooltipInfo title="File Format" />
        </div>
        <FormControl>
          <RadioGroup
            aria-labelledby="file-format"
            name="fileFormat"
            value={formData.fileFormat}
            onChange={handleOnChange}
          >
            <FormControlLabel
              value="Comma-Separated"
              control={<Radio />}
              label="Comma-Separated"
            />
            <FormControlLabel
              value="MS Excel 2007+"
              control={<Radio />}
              label="MS Excel 2007+"
            />
          </RadioGroup>
        </FormControl>
      </div>
    </>
  )
}
