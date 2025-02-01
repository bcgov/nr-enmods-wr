import {
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
} from "@mui/material"
import TooltipInfo from "../TooltipInfo"

export default function DownloadForm(props: any) {
  return (
    <>
      <p>
        Specify a data type and file format to download. Additional options are
        available in the
        <a href="#"> Advance</a> fields are optional
      </p>

      <div>
        <FormControl>
          <FormLabel id="file-format-label">
            File Format <TooltipInfo title="File Format" />
          </FormLabel>

          <RadioGroup
            aria-labelledby="file-format-label"
            name="fileFormat"
            defaultValue="commaSeparated"
          >
            <FormControlLabel
              value="commaSeparated"
              control={<Radio />}
              label="Comma-Separated"
            />
          </RadioGroup>
        </FormControl>
      </div>
    </>
  )
}
