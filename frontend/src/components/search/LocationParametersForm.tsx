/* eslint-disable prettier/prettier */
import React from "react"
import { Grid, TextField } from "@mui/material"
import TooltipInfo from "../TooltipInfo"
import TitleText from "../TitleText"
import Btn from "../Btn"
import { fontSize } from "~/@mui/system"

export default function LocationParametersForm(props) {
  const { formData, handleOnChange } = props

  console.log(formData)
  return (
    <>
      <p>
        Specify location parameters to describe the spatial extent of the
        desired dataset. Additional options are available in the
        <a href="#"> Advance</a> fields are optional
      </p>

      <div>
        <div className="flex-row">
          <TitleText variant="subtitle1" text="Location Type" />
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
          <TitleText variant="subtitle1" text="Location Name" />
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
          <TitleText variant="subtitle1" text="Permit Number" />
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

        <div className="flex-row">
          <TitleText variant="subtitle1" text="Point Location" />
          <TooltipInfo title="Point Location" />
        </div>

        <Grid container spacing={2}>
          <Grid item>
            <div className="search-point-location">
              <div>
                <TitleText
                  variant="body2"
                  text="Within"
                  sx={{ fontSize: "9pt" }}
                />
              </div>
              <div>
                <div>
                  <TitleText
                    variant="body2"
                    text="Miles of"
                    sx={{ fontSize: "8pt" }}
                  />
                </div>
                <div>
                  <TextField
                    variant="outlined"
                    size="small"
                    name="milesOf"
                    value={formData.milesOf}
                    onChange={handleOnChange}
                  />
                </div>
              </div>
              <div>
                <div>
                  <TitleText
                    variant="body2"
                    text="Lat"
                    sx={{ fontSize: "8pt" }}
                  />
                </div>
                <div>
                  <TextField
                    variant="outlined"
                    size="small"
                    name="lat"
                    value={formData.lat}
                    onChange={handleOnChange}
                  />
                </div>
              </div>
              <div>
                <div>
                  <TitleText
                    variant="body2"
                    text="Long"
                    sx={{ fontSize: "8pt" }}
                  />
                </div>
                <div>
                  <TextField
                    variant="outlined"
                    size="small"
                    name="long"
                    value={formData.long}
                    onChange={handleOnChange}
                  />
                </div>
              </div>
              <div className="margin-top-1">
                <Btn
                  text={"Use my location"}
                  type="button"
                  size="small"
                  sx={{ fontSize: "8pt" }}
                  fullWidth={true}
                />
              </div>
            </div>
          </Grid>
        </Grid>
      </div>
    </>
  )
}
