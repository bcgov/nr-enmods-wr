import Btn from "@/components/Btn"
import { Link } from "react-router-dom"
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Grid,
  TextField,
} from "@mui/material"
import { GridExpandMoreIcon } from "@mui/x-data-grid"
import TitleText from "@/components/TitleText"
import TooltipInfo from "@/components/TooltipInfo"

type Props = {}

const AdvanceSearch = (props: Props) => {
  return (
    <>
      <div className="padding-1">
        <div className="flex-row">
          <Link to="/search/basic" className="search-btn">
            Basic
          </Link>

          <Link to="/search/advance" className="search-btn">
            Advance
          </Link>
        </div>

        <form noValidate>
          <div className="padding-1">
            {/* Select Location Parameter  */}
            <Accordion>
              <AccordionSummary
                expandIcon={<GridExpandMoreIcon />}
                aria-controls="select-location-parameter-content"
                id="select-location-parameter"
                sx={{ background: "#f7f7f7" }}
              >
                <TitleText
                  variant="subtitle1"
                  sx={{ fontWeight: 600 }}
                  text="Select Location Parameters"
                />
              </AccordionSummary>
              <AccordionDetails>
                <p>
                  Specify location paramerters to describe the spatial extent of
                  the desired dataset. All fields are optional.
                </p>

                <Grid container spacing={2}>
                  <Grid item xs={3}>
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
                        value={""}
                      />
                    </div>
                    <div className="flex-row">
                      <TitleText
                        variant="subtitle1"
                        text="Location Name or ID"
                        sx={{ fontWeight: 600 }}
                      />
                      <TooltipInfo title="Location Name or ID" />
                    </div>
                    <div>
                      <TextField
                        variant="outlined"
                        size="small"
                        name="locationType"
                        value={""}
                      />
                    </div>
                    <div className="flex-row">
                      <TitleText
                        variant="subtitle1"
                        text="Permit ID"
                        sx={{ fontWeight: 600 }}
                      />
                      <TooltipInfo title="Permit ID" />
                    </div>
                    <div>
                      <TextField
                        variant="outlined"
                        size="small"
                        name="locationType"
                        value={""}
                      />
                    </div>
                  </Grid>
                  <Grid item xs={3}>
                    <div className="flex-row">
                      <TitleText
                        variant="subtitle1"
                        text="Point Location"
                        sx={{ fontWeight: 600 }}
                      />
                      <TooltipInfo title="Point Location" />
                    </div>
                    <div className="flex-row">
                      <TitleText
                        variant="body1"
                        text="Within"
                        sx={{ fontWeight: 500 }}
                      />
                    </div>
                    <div>
                      <TextField
                        variant="outlined"
                        size="small"
                        name="within"
                        value={""}
                      />
                    </div>
                    <div className="flex-row">
                      <TitleText
                        variant="body1"
                        text="kilometers of"
                        sx={{ fontWeight: 500 }}
                      />
                    </div>
                    <div className="flex-row">
                      <TitleText
                        variant="body1"
                        text="Latitude"
                        sx={{ fontWeight: 500 }}
                      />
                    </div>
                    <div>
                      <TextField
                        variant="outlined"
                        size="small"
                        name="within"
                        value={""}
                      />
                    </div>
                    <div className="flex-row">
                      <TitleText
                        variant="body1"
                        text="Longitude"
                        sx={{ fontWeight: 500 }}
                      />
                    </div>
                    <div>
                      <TextField
                        variant="outlined"
                        size="small"
                        name="within"
                        value={""}
                      />
                    </div>
                    <div className="padding-y-1">
                      <Btn text="Use my Location" size="small" />
                    </div>
                  </Grid>
                  <Grid item xs={3}>
                    <div className="flex-row">
                      <TitleText
                        variant="subtitle1"
                        text="Bounding Box"
                        sx={{ fontWeight: 600 }}
                      />
                      <TooltipInfo title="Bounding Box" />
                    </div>
                    <div className="flex-row">
                      <TitleText
                        variant="body1"
                        text="North:"
                        sx={{ fontWeight: 500 }}
                      />
                    </div>
                    <div>
                      <TextField
                        variant="outlined"
                        size="small"
                        name="north"
                        value={""}
                      />
                    </div>
                    <div className="flex-row">
                      <TitleText
                        variant="body1"
                        text="South:"
                        sx={{ fontWeight: 500 }}
                      />
                    </div>
                    <div>
                      <TextField
                        variant="outlined"
                        size="small"
                        name="south"
                        value={""}
                      />
                    </div>
                    <div className="flex-row">
                      <TitleText
                        variant="body1"
                        text="East:"
                        sx={{ fontWeight: 500 }}
                      />
                    </div>
                    <div>
                      <TextField
                        variant="outlined"
                        size="small"
                        name="east"
                        value={""}
                      />
                    </div>
                    <div className="flex-row">
                      <TitleText
                        variant="body1"
                        text="West:"
                        sx={{ fontWeight: 500 }}
                      />
                    </div>
                    <div>
                      <TextField
                        variant="outlined"
                        size="small"
                        name="west"
                        value={""}
                      />
                    </div>
                  </Grid>
                  <Grid item xs={3}>
                    <div className="flex-row">
                      <TitleText
                        variant="subtitle1"
                        text="Project Name"
                        sx={{ fontWeight: 600 }}
                      />
                      <TooltipInfo title="Project Name" />
                    </div>
                    <div>
                      <TextField
                        variant="outlined"
                        size="small"
                        name="locationType"
                        value={""}
                      />
                    </div>

                    <div className="flex-row">
                      <TitleText
                        variant="subtitle1"
                        text="Location Group"
                        sx={{ fontWeight: 600 }}
                      />
                      <TooltipInfo title="Location Group" />
                    </div>
                    <div>
                      <TextField
                        variant="outlined"
                        size="small"
                        name="locationType"
                        value={""}
                      />
                    </div>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
            {/* Filter Results */}
            <Accordion>
              <AccordionSummary
                expandIcon={<GridExpandMoreIcon />}
                aria-controls="filter-results-content"
                id="filter-results"
                sx={{ background: "#f7f7f7" }}
              >
                <TitleText
                  variant="subtitle1"
                  sx={{ fontWeight: 600 }}
                  text="Filter Results"
                />
              </AccordionSummary>
              <AccordionDetails>
                <p>
                  Specify data source, date range, and sampling filters to apply
                  to the desired dataset. All fields are optional.
                </p>

                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <div className="flex-row">
                      <TitleText
                        variant="subtitle1"
                        text="Sample Medium"
                        sx={{ fontWeight: 600 }}
                      />
                      <TooltipInfo title="Location Type" />
                    </div>
                    <div>
                      <TextField
                        variant="outlined"
                        size="small"
                        name="locationType"
                        value={""}
                      />
                    </div>
                    <div className="flex-row">
                      <TitleText
                        variant="subtitle1"
                        text="Observed Property Group"
                        sx={{ fontWeight: 600 }}
                      />
                      <TooltipInfo title="Location Name or ID" />
                    </div>
                    <div>
                      <TextField
                        variant="outlined"
                        size="small"
                        name="locationType"
                        value={""}
                      />
                    </div>
                    <div className="flex-row">
                      <TitleText
                        variant="subtitle1"
                        text="Observed Property"
                        sx={{ fontWeight: 600 }}
                      />
                      <TooltipInfo title="Permit ID" />
                    </div>
                    <div>
                      <TextField
                        variant="outlined"
                        size="small"
                        name="locationType"
                        value={""}
                      />
                    </div>
                    <div className="flex-row">
                      <TitleText
                        variant="subtitle1"
                        text="Worked Order Number"
                        sx={{ fontWeight: 600 }}
                      />
                      <TooltipInfo title="Permit ID" />
                    </div>
                    <div>
                      <TextField
                        variant="outlined"
                        size="small"
                        name="locationType"
                        value={""}
                      />
                    </div>
                  </Grid>

                  <Grid item xs={4}>
                    <div className="flex-row">
                      <TitleText
                        variant="subtitle1"
                        text="Sampling Agency"
                        sx={{ fontWeight: 600 }}
                      />
                      <TooltipInfo title="Point Location" />
                    </div>

                    <div>
                      <TextField
                        variant="outlined"
                        size="small"
                        name="within"
                        value={""}
                      />
                    </div>

                    <div className="flex-row">
                      <TitleText
                        variant="subtitle1"
                        text="Analyzing Agency"
                        sx={{ fontWeight: 600 }}
                      />
                      <TooltipInfo title="Point Location" />
                    </div>
                    <div>
                      <TextField
                        variant="outlined"
                        size="small"
                        name="within"
                        value={""}
                      />
                    </div>
                    <div className="flex-row">
                      <TitleText
                        variant="subtitle1"
                        text="Analytical Method"
                        sx={{ fontWeight: 600 }}
                      />
                      <TooltipInfo title="Point Location" />
                    </div>
                    <div>
                      <TextField
                        variant="outlined"
                        size="small"
                        name="within"
                        value={""}
                      />
                    </div>

                    <div className="flex-row">
                      <TitleText
                        variant="subtitle1"
                        text="Taxonomic Name"
                        sx={{ fontWeight: 600 }}
                      />
                      <TooltipInfo title="Point Location" />
                    </div>
                    <div>
                      <TextField
                        variant="outlined"
                        size="small"
                        name="within"
                        value={""}
                      />
                    </div>
                  </Grid>

                  <Grid item xs={4}>
                    <div className="flex-row">
                      <TitleText
                        variant="subtitle1"
                        text="Date Range"
                        sx={{ fontWeight: 600 }}
                      />
                      <TooltipInfo title="Project Name" />
                    </div>
                    <div className="flex-row">
                      <TitleText
                        variant="body2"
                        text="Dates should be entered as mm-dd-yyyy, mm-yyyy. or yyyy"
                        sx={{ fontWeight: 500 }}
                      />
                    </div>
                    <div className="flex-row">
                      <TitleText
                        variant="body2"
                        text="from:"
                        sx={{ fontWeight: 500 }}
                      />
                    </div>
                    <div>
                      <TextField
                        variant="outlined"
                        size="small"
                        name="locationType"
                        value={""}
                      />
                    </div>

                    <div className="flex-row">
                      <TitleText
                        variant="body2"
                        text="to:"
                        sx={{ fontWeight: 500 }}
                      />
                    </div>
                    <div>
                      <TextField
                        variant="outlined"
                        size="small"
                        name="to"
                        value={""}
                      />
                    </div>

                    <div className="flex-row">
                      <TitleText
                        variant="subtitle1"
                        text="Minimum Sampling Activities Per location"
                        sx={{ fontWeight: 600 }}
                      />
                      <TooltipInfo title="Project Name" />
                    </div>
                    <div>
                      <TextField
                        variant="outlined"
                        size="small"
                        name="locationType"
                        value={""}
                      />
                    </div>
                    <div className="flex-row">
                      <TitleText
                        variant="subtitle1"
                        text="Minimum Results Per location"
                        sx={{ fontWeight: 600 }}
                      />
                      <TooltipInfo title="Project Name" />
                    </div>
                    <div>
                      <TextField
                        variant="outlined"
                        size="small"
                        name="locationType"
                        value={""}
                      />
                    </div>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
            {/* Additional Criteria */}
            <Accordion>
              <AccordionSummary
                expandIcon={<GridExpandMoreIcon />}
                aria-controls="additional-criteria-content"
                id="additional-criteria"
                sx={{ background: "#f7f7f7" }}
              >
                <TitleText
                  variant="subtitle1"
                  sx={{ fontWeight: 600 }}
                  text="Additional Criteria"
                />
              </AccordionSummary>
              <AccordionDetails>
                <p>
                  Specify data source, date range, and sampling filters to apply
                  to the desired dataset. All fields are optional.
                </p>

                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <div className="flex-row">
                      <TitleText
                        variant="subtitle1"
                        text="Collection Method"
                        sx={{ fontWeight: 600 }}
                      />
                    </div>
                    <div>
                      <TextField
                        variant="outlined"
                        size="small"
                        name="collectionMethod"
                        value={""}
                      />
                    </div>
                    <div className="flex-row">
                      <TitleText
                        variant="subtitle1"
                        text="QC Sample Type"
                        sx={{ fontWeight: 600 }}
                      />
                      <TooltipInfo title="QC Sample Type" />
                    </div>
                    <div>
                      <TextField
                        variant="outlined"
                        size="small"
                        name="qcSampleType"
                        value={""}
                      />
                    </div>
                    <div className="flex-row">
                      <TitleText
                        variant="subtitle1"
                        text="Data Classification"
                        sx={{ fontWeight: 600 }}
                      />
                      <TooltipInfo title="Data Classification" />
                    </div>
                    <div>
                      <TextField
                        variant="outlined"
                        size="small"
                        name="dataClassification"
                        value={""}
                      />
                    </div>
                    <div className="flex-row">
                      <TitleText
                        variant="subtitle1"
                        text="Sample Depth (m)"
                        sx={{ fontWeight: 600 }}
                      />
                      <TooltipInfo title="Sample Depth" />
                    </div>
                    <div>
                      <TextField
                        variant="outlined"
                        size="small"
                        name="sampleDepth"
                        value={""}
                      />
                    </div>
                  </Grid>

                  <Grid item xs={4}>
                    <div className="flex-row">
                      <TitleText
                        variant="subtitle1"
                        text="Units"
                        sx={{ fontWeight: 600 }}
                      />
                      <TooltipInfo title="Units" />
                    </div>

                    <div>
                      <TextField
                        variant="outlined"
                        size="small"
                        name="units"
                        value={""}
                      />
                    </div>

                    <div className="flex-row">
                      <TitleText
                        variant="subtitle1"
                        text="Specimen ID"
                        sx={{ fontWeight: 600 }}
                      />
                      <TooltipInfo title="Specimen ID" />
                    </div>
                    <div>
                      <TextField
                        variant="outlined"
                        size="small"
                        name="specimenId"
                        value={""}
                      />
                    </div>
                  </Grid>

                  <Grid item xs={4}>
                    <div className="flex-row">
                      <TitleText
                        variant="subtitle1"
                        text="Lab Arrival Date Range"
                        sx={{ fontWeight: 600 }}
                      />
                    </div>
                    <div className="flex-row">
                      <TitleText
                        variant="body2"
                        text="Dates should be entered as mm-dd-yyyy, mm-yyyy. or yyyy"
                        sx={{ fontWeight: 500 }}
                      />
                    </div>
                    <div className="flex-row">
                      <TitleText
                        variant="body2"
                        text="from:"
                        sx={{ fontWeight: 500 }}
                      />
                    </div>
                    <div>
                      <TextField
                        variant="outlined"
                        size="small"
                        name="from"
                        value={""}
                      />
                    </div>

                    <div className="flex-row">
                      <TitleText
                        variant="body2"
                        text="to:"
                        sx={{ fontWeight: 500 }}
                      />
                    </div>
                    <div>
                      <TextField
                        variant="outlined"
                        size="small"
                        name="to"
                        value={""}
                      />
                    </div>

                    <div className="flex-row">
                      <TitleText
                        variant="subtitle1"
                        text="Lab Batch ID"
                        sx={{ fontWeight: 600 }}
                      />
                      <TooltipInfo title="Lab Batch ID" />
                    </div>
                    <div>
                      <TextField
                        variant="outlined"
                        size="small"
                        name="labBatchId"
                        value={""}
                      />
                    </div>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          </div>
        </form>
      </div>
    </>
  )
}

export default AdvanceSearch
