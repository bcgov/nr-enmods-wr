/* eslint-disable prettier/prettier */
import Btn from "@/components/Btn"
import TitleText from "@/components/TitleText"
import { Badge, Grid, Step, StepLabel, Stepper } from "@mui/material"
import { useMultiStepForm } from "@/hook/useMultiFormStep"
import LocationParametersForm from "@/components/search/LocationParametersForm"
import FilterResultsForm from "@/components/search/FilterResultsForm"
import DownloadForm from "@/components/search/DownloadForm"

const SearchPage = () => {
  const { next, back, step, steps, activeStep, isFirstStep, isLastStep, goToPage } =
    useMultiStepForm([
      <LocationParametersForm />,
      <FilterResultsForm />,
      <DownloadForm />,
    ])



  return (
    <div className="padding-1">
      <div className="flex-row">
        <Btn text={"Basic"} sx={{ fontSize: "8pt" }} />
        <Btn text={"Advance"} sx={{ fontSize: "8pt" }} />
      </div>

      <div className="padding-y-1">
        <TitleText
          variant="subtitle2"
          text="Download Water Quality Data"
          sx={{ fontWeight: 700 }}
        />
        <div className="padding-y-1">
          <Stepper activeStep={activeStep}>
            <Step>
              <StepLabel></StepLabel>
            </Step>
            <Step>
              <StepLabel></StepLabel>
            </Step>
            <Step>
              <StepLabel></StepLabel>
            </Step>
          </Stepper>
        </div>
      </div>

      <form>
        <div className="flex-row gap-half">
          <div className="flex-row gap-1">
            <Badge badgeContent={activeStep + 1} color="primary"></Badge>
            <div style={{ color: "#3178c4" }}>of {steps.length} </div>
          </div>

          <TitleText
            text={
              activeStep == 0
                ? "Location Parameters"
                : activeStep == 1
                  ? "Filter Results"
                  : "Download"
            }
            variant="subtitle1"
            sx={{ fontWeight: 600 }}
          />
        </div>

        {step}

        <Grid container>
          <Grid item sx={{ height: 40 }}></Grid>
        </Grid>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <div className="flex-row">
              <Btn
                text={isLastStep ? "Start Over" : "Clear Search"}
                size="small"
                type="button"
                handleClick={goToPage}
                sx={{ background: "#fff", color: "#0B5394", fontSize: "8pt" }}
              />
              {!isFirstStep && (
                <Btn
                  text={"Previous"}
                  size="small"
                  type="button"
                  handleClick={back}
                  sx={{ fontSize: "8pt" }}
                />
              )}

              <Btn
                text={isLastStep ? "Download" : "Next"}
                size="small"
                type="button"
                handleClick={next}
                sx={{ fontSize: "8pt" }}
              />
            </div>
          </Grid>
        </Grid>
      </form>
    </div>
  )
}

export default SearchPage
