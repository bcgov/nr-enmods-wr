import Btn from "@/components/Btn"
import TitleText from "@/components/TitleText"
import { Badge, Grid } from "@mui/material"
import { useMultiStepForm } from "@/customHook/useMultiFormStep"
import LocationParametersForm from "@/components/search/LocationParametersForm"
import FilterResultsForm from "@/components/search/FilterResultsForm"
import DownloadForm from "@/components/search/DownloadForm"
import { useEffect, useState } from "react"
import apiService from "@/service/api-service"
import type BasicSearchFormType from "@/interfaces/BasicSearchFormType"
import HorizontalStepper from "@/components/stepper/HorizontalStepper"
import { Link } from "react-router-dom"
import debounce from "lodash/debounce"
import { BasicSearchAttributes } from "@/enum/basicSearchEnum"
import { API_VERSION, extractFileName } from "@/util/utility"

const BasicSearch = () => {
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    null,
    null,
  ])
  const [locationTypes, setLocationTypes] = useState([])
  const [locationNames, setLocationNames] = useState([])
  const [permitNumbers, setPermitNumbers] = useState([])
  const [mediums, setMediums] = useState([])
  const [observedProperties, setObservedProperties] = useState([])
  const noOfSteps = [1, 2, 3]
  const [formData, setFormData] = useState<BasicSearchFormType>({
    locationType: null,
    locationName: [],
    permitNumber: [],
    fromDate: null,
    toDate: null,
    media: [],
    observedPropertyGrp: [],
    fileFormat: "",
  })

  const setBackendUrl = (
    fieldName: string,
    query: string,
  ): string | undefined => {
    if (fieldName) {
      switch (fieldName) {
        case BasicSearchAttributes.ObservedPropertyGrp:
          return `${API_VERSION}/search/getObservedProperties?search=${query}`
        case BasicSearchAttributes.Media:
          return `${API_VERSION}/search/getMediums?search=${query}`
        case BasicSearchAttributes.PermitNo:
          return `${API_VERSION}/search/getPermitNumbers?search=${query}`
        case BasicSearchAttributes.LocationName:
          return `${API_VERSION}/search/getLocationNames?search=${query}`
        case BasicSearchAttributes.LocationType:
          return `${API_VERSION}/search/getLocationTypes`
        default:
          return
      }
    }
  }
  const getDropdownOptions = async (
    fieldName: string,
    query: string,
  ): Promise<void> => {
    try {
      const url = setBackendUrl(fieldName, query)
      if (url) {
        const apiData = await apiService.getAxiosInstance().get(url)
        if (apiData.status === 200) {
          const response = apiData.data.domainObjects
          if (fieldName === BasicSearchAttributes.ObservedPropertyGrp)
            setObservedProperties(response)
          if (fieldName === BasicSearchAttributes.Media) setMediums(response)
          if (fieldName === BasicSearchAttributes.PermitNo)
            setPermitNumbers(response)
          if (fieldName === BasicSearchAttributes.LocationName)
            setLocationNames(response)
          if (fieldName === BasicSearchAttributes.LocationType)
            setLocationTypes(response)
        }
      }
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    getDropdownOptions(BasicSearchAttributes.ObservedPropertyGrp, "")
    getDropdownOptions(BasicSearchAttributes.Media, "")
    getDropdownOptions(BasicSearchAttributes.PermitNo, "")
    getDropdownOptions(BasicSearchAttributes.LocationName, "")
    getDropdownOptions(BasicSearchAttributes.LocationType, "")
  }, [])

  useEffect(() => {
    if (dateRange) {
      setFormData({ ...formData, fromDate: dateRange[0], toDate: dateRange[1] })
    }
  }, [dateRange])

  const handleOnChange = (
    e: React.SyntheticEvent,
    val: any,
    attrName: string,
  ) => {
    setFormData({ ...formData, [attrName]: val })
  }

  const debounceSearch = debounce(async (query, attrName) => {
    switch (attrName) {
      case BasicSearchAttributes.LocationName:
        getDropdownOptions(BasicSearchAttributes.LocationName, query)
        break
      case BasicSearchAttributes.PermitNo:
        getDropdownOptions(BasicSearchAttributes.PermitNo, query)
        break
      case BasicSearchAttributes.Media:
        getDropdownOptions(BasicSearchAttributes.Media, query)
        break
      case BasicSearchAttributes.ObservedPropertyGrp:
        getDropdownOptions(BasicSearchAttributes.ObservedPropertyGrp, query)
        break
      default:
        break
    }
  }, 500)

  const handleInputChange = (
    e: React.SyntheticEvent,
    newVal: any,
    attrName: string,
  ) => {
    if (attrName) debounceSearch(newVal, attrName)
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
      locationTypes={locationTypes}
      locationNames={locationNames}
      handleInputChange={handleInputChange}
      permitNumbers={permitNumbers}
      handleOnChange={handleOnChange}
    />,
    <FilterResultsForm
      key="1"
      formData={formData}
      setDateRange={setDateRange}
      dateRange={dateRange}
      mediums={mediums}
      observedProperties={observedProperties}
      handleInputChange={handleInputChange}
      handleOnChange={handleOnChange}
    />,
    <DownloadForm key="2" formData={formData} />,
  ])

  const basicSearch = async (): Promise<void> => {
    try {
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
    console.log(formData)
    basicSearch()
  }

  const clearForm = () => {
    switch (activeStep) {
      case 0:
        setFormData({
          ...formData,
          locationType: null,
          locationName: [],
          permitNumber: [],
        })
        break
      case 1:
        setDateRange([null, null])
        setFormData({
          ...formData,
          fromDate: null,
          toDate: null,
          media: [],
          observedPropertyGrp: [],
        })
        break
      case 2:
        setDateRange([null, null])
        setFormData({
          ...formData,
          locationType: null,
          locationName: [],
          permitNumber: [],
          fromDate: null,
          toDate: null,
          media: [],
          observedPropertyGrp: [],
          fileFormat: "",
        })
        goToPage()
        break
      default:
        break
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
                type="button"
                handleClick={clearForm}
                sx={{ background: "#fff", color: "#0B5394", fontSize: "8pt" }}
              />
              {!isFirstStep && (
                <Btn
                  text={"Previous"}
                  type="button"
                  handleClick={back}
                  sx={{ fontSize: "8pt" }}
                />
              )}

              {!isLastStep && (
                <Btn
                  text="Next"
                  type="button"
                  handleClick={next}
                  sx={{ fontSize: "8pt" }}
                />
              )}

              {isLastStep && (
                <Btn
                  text={isLastStep ? "Download" : "Next"}
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
