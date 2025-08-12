import {
  Badge,
  FormControl,
  FormControlLabel,
  FormLabel,
  Grid,
  Radio,
  RadioGroup,
} from "@mui/material"
import TooltipInfo from "../TooltipInfo"
import TitleText from "../TitleText"

export default function DownloadForm(props: any) {
  return (
    <>
      <div className="py-2">
        <TitleText
          text={"Specify a data type and file format to download."}
          variant="body2"
          sx={{ fontWeight: 500, p: 1 }}
        />
      </div>
      <div className="p-4">
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
