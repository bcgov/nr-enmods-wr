/* eslint-disable prettier/prettier */
import React from "react"
import {
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
} from "@mui/material"
import TitleText from "../TitleText"
import TooltipInfo from "../TooltipInfo"

export default function DownloadForm(props) {

  const {formData, handleOnChange} = props;

  return (
    <>
      <p>
        Specify a data type and file format to download. Additional options are available in the
        <a href="#"> Advance</a> fields are optional
      </p>

      <div>
        <div className="flex-row">
          <TitleText variant="subtitle1" text="Data Profiles" />
          <TooltipInfo title="Data Profiles" />
        </div>
        <FormControl>
          <RadioGroup
            aria-labelledby="data-profiles"
            name="dataProfiles"
            value={formData.dataProfiles}
            onChange={handleOnChange}
          >
            <FormControlLabel
              value="Organization Data"
              control={<Radio />}
              label="Organization Data"
            />
            <FormControlLabel
              value="Site Data Only"
              control={<Radio />}
              label="Site Data Only"
            />
            <FormControlLabel
              value="Project Data"
              control={<Radio />}
              label="Project Data"
            />
            <FormControlLabel
              value="Sample Results (physical/chemical metadata)"
              control={<Radio />}
              label="Sample Results (physical/chemical metadata)"
            />
            <FormControlLabel
              value="Sample Results (biological metadata)"
              control={<Radio />}
              label="Sample Results (biological metadata)"
            />
            <FormControlLabel
              value="Sample Results (narrow)"
              control={<Radio />}
              label="Sample Results (narrow)"
            />
            <FormControlLabel
              value="Sampling Activity"
              control={<Radio />}
              label="Sampling Activity"
            />
          </RadioGroup>
        </FormControl>

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
