import React from "react"
import TitleText from "../TitleText"
import TooltipInfo from "../TooltipInfo"
import { Grid, TextField } from "@mui/material"
import { fontSize } from "~/@mui/system"

export default function FilterResultsForm(props) {
  return (
    <>
      <p>
        Specify data source, date range, and sampling filters to apply to the
        desired dataset. Additional options are available in the
        <a href="#"> Advance</a> fields are optional
      </p>

      <div>
        <div className="flex-row">
          <TitleText variant="subtitle1" text="Date Range" />
          <TooltipInfo title="Date Range" />
        </div>
        <div>
          <TitleText
            variant="body2"
            sx={{fontSize: "8pt"}}
            text="Dates should be entered as mm-dd-yyyy, mm-yyyy, or yyyy"
          />
        </div>
        <div>
          <TitleText variant="body2" text="from:" sx={{fontSize: "9pt"}} />
        </div>
        <div>
          <TextField variant="outlined" size="small" />
        </div>
        <div>
          <TitleText variant="body2" text="to:" sx={{fontSize: "9pt"}}/>
        </div>
        <div>
          <TextField variant="outlined" size="small" />
        </div>
        <div className="flex-row">
          <TitleText variant="subtitle1" text="Sample Media" />
          <TooltipInfo title="Sample Media" />
        </div>
        <div>
          <TextField variant="outlined" size="small" />
        </div>
        <div className="flex-row">
          <TitleText variant="subtitle1" text="Sample Media Detail" />
          <TooltipInfo title="Sample Media Detail" />
        </div>
        <div>
          <TextField variant="outlined" size="small" />
        </div>

        <div className="flex-row">
          <TitleText variant="subtitle1" text="Observed Property Group" />
          <TooltipInfo title="Observed Property Group" />
        </div>
        <div>
          <TextField variant="outlined" size="small" />
        </div>
      </div>
    </>
  )
}
