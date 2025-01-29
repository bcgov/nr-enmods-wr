import Btn from "@/components/Btn"
import TitleText from "@/components/TitleText"
import { Badge, Grid } from "@mui/material"
import { useMultiStepForm } from "@/hook/useMultiFormStep"
import LocationParametersForm from "@/components/search/LocationParametersForm"
import FilterResultsForm from "@/components/search/FilterResultsForm"
import DownloadForm from "@/components/search/DownloadForm"
import { useState } from "react"
import apiService from "@/service/api-service"
import type ChangeEventHandlerType from "@/interfaces/ChangeEventHandlerType"
import type BasicSearchFormType from "@/interfaces/BasicSearchFormType"
import HorizontalStepper from "@/components/stepper/HorizontalStepper"
import { Link, useNavigate } from "react-router-dom"

const BasicSearch = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState<BasicSearchFormType>({
    locationType: "ee355707-5dec-4389-b5a0-3c4b5e48eb1b",
    locationName: "",
    permitNumber: "",
    dateFrom: "",
    dateTo: "",
    media: "",
    observedPropertyGrp: "",
    fileFormat: "",
  })
  const noOfSteps = [1, 2, 3]
  const handleOnChange = (e: ChangeEventHandlerType) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const {
    next,
    back,
    step,
    steps,
    activeStep,
    isFirstStep,
    isLastStep,
    goToPage,
  } = useMultiStepForm([
    <LocationParametersForm
      key="0"
      formData={formData}
      handleOnChange={(e: ChangeEventHandlerType) => handleOnChange(e)}
    />,
    <FilterResultsForm
      key="1"
      formData={formData}
      handleOnChange={(e: ChangeEventHandlerType) => handleOnChange(e)}
    />,
    <DownloadForm
      key="2"
      formData={formData}
      handleOnChange={(e: ChangeEventHandlerType) => handleOnChange(e)}
    />,
  ])

  const extractFileName = (contentDisposition: string): string => {
    const regex = /filename="?([^"]+)"?/
    const match = contentDisposition ? contentDisposition.match(regex) : null
    return match ? match[1] : ""
  }

  const basicSearch = async (): Promise<void> => {
    try {
      console.log(formData)
      const response = await apiService
        .getAxiosInstance()
        .get("/v1/search/basicSearch", { params: formData })

      if (response.status === 200) {
        const url = window.URL.createObjectURL(new Blob([response.data]))
        const link = document.createElement("a")
        link.href = url
        link.download = extractFileName(response.headers["content-disposition"])
        link.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    basicSearch()
  }

  const clearForm = () => {
    if (!isLastStep) {
      switch (activeStep) {
        case 0:
          setFormData({
            ...formData,
            locationType: "",
            locationName: "",
            permitNumber: "",
          })
          break
        case 1:
          setFormData({
            ...formData,
            dateFrom: "",
            dateTo: "",
            media: "",
            observedPropertyGrp: "",
          })
          break
        default:
          break
      }
    } else {
      setFormData({
        ...formData,
        locationType: "",
        locationName: "",
        permitNumber: "",
        dateFrom: "",
        dateTo: "",
        media: "",
        observedPropertyGrp: "",
        fileFormat: "",
      })
      goToPage()
    }
  }

  return (
    <div className="padding-1">
      <div className="flex-row">
        <Link to="/search/basic" className="search-btn">
          Basic
        </Link>

        <Link to="/search/advance" className="search-btn">
          Advance
        </Link>
      </div>

      <div className="padding-y-1">
        <TitleText
          variant="subtitle2"
          text="Download Water Quality Data"
          sx={{ fontWeight: 700 }}
        />
        <div className="padding-y-1">
          <HorizontalStepper activeStep={activeStep} noOfSteps={noOfSteps} />
        </div>
      </div>

      <form noValidate onSubmit={onSubmit}>
        <div className="flex-row gap-half padding-1">
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
            variant="h6"
            sx={{ fontWeight: 600 }}
          />
        </div>
        <div className="padding-x-1">{step}</div>

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
                handleClick={clearForm}
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

              {!isLastStep && (
                <Btn
                  text="Next"
                  size="small"
                  type="button"
                  handleClick={next}
                  sx={{ fontSize: "8pt" }}
                />
              )}

              {isLastStep && (
                <Btn
                  text={isLastStep ? "Download" : "Next"}
                  size="small"
                  type={isLastStep ? "submit" : "button"}
                  handleClick={next}
                  sx={{ fontSize: "8pt" }}
                />
              )}
            </div>
          </Grid>
        </Grid>
      </form>
    </div>
  )
}

export default BasicSearch
