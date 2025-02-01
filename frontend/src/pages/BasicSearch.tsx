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
import { BasicSearchAttributes } from "@/util/basicSearchEnum"
import { Axios, AxiosResponse } from "~/axios"

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

  const getLocationTypes = async (): Promise<void> => {
    try {
      const apiData = await apiService
        .getAxiosInstance()
        .get("/v1/search/getLocationTypes")
      if (apiData.status === 200) {
        //  console.log(apiData.data)
        setLocationTypes(apiData.data.domainObjects)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const getLocationNames = async (query: string): Promise<void> => {
    try {
      const apiData = await apiService
        .getAxiosInstance()
        .get("v1/search/getLocationNames", {
          params: {
            search: query,
          },
        })
      if (apiData.status === 200) {
        // console.log(apiData.data)
        setLocationNames(apiData.data.domainObjects)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const getPermitNumbers = async (query: string): Promise<void> => {
    try {
      const apiData = await apiService
        .getAxiosInstance()
        .get("v1/search/getPermitNumbers", {
          params: {
            search: query,
          },
        })
      if (apiData.status === 200) {
        // console.log(apiData)
        setPermitNumbers(apiData.data.domainObjects)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const getMediums = async (query: string): Promise<void> => {
    //console.log(query);
    try {
      const apiData = await apiService
        .getAxiosInstance()
        .get("v1/search/getMediums", {
          params: {
            search: query,
          },
        })
      if (apiData.status === 200) {
        //console.log(apiData.data)
        setMediums(apiData.data.domainObjects)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const getObservedProperties = async (query: string): Promise<void> => {
    try {
      const apiData = await apiService
        .getAxiosInstance()
        .get("v1/search/getObservedProperties", {
          params: {
            search: query,
          },
        })
      if (apiData.status === 200) {
        // console.log(apiData)
        setObservedProperties(apiData.data.domainObjects)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const getDropdownOptions = async (
    query: string,
    fieldName: string,
  ): Promise<void> => {
    try {
      const url = setUrl(fieldName, query)
      const apiData = await apiService.getAxiosInstance().get(url)
      if (apiData.status === 200) {
        const response = apiData.data.domainObjects
        if (fieldName === "observedProperties") setObservedProperties(response)
        if (fieldName === "media") setMediums(response)
        if (fieldName === "permitNo") setPermitNumbers(response)
        if (fieldName === "locationName") setLocationNames(response)
        if (fieldName === "locationType") setLocationTypes(response)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const setUrl = (fieldName: string, query: string) => {
    if (fieldName === "observedProperties")
      return `v1/search/getObservedProperties?search=${query}`
    if (fieldName === "media") return `v1/search/getMediums?search=${query}`
    if (fieldName === "permitNo")
      return `v1/search/getPermitNumbers?search=${query}`
    if (fieldName === "locationName")
      return `v1/search/getLocationNames?search=${query}`
    if (fieldName === "locationType") return `/v1/search/getLocationTypes`

    return
  }

  useEffect(() => {
    getLocationTypes()
    getLocationNames("")
    getPermitNumbers("")
    getMediums("")
    getObservedProperties("")
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
    console.log(attrName)
    if (attrName === BasicSearchAttributes.LocationName) getLocationNames(query)
    if (attrName === BasicSearchAttributes.PermitNo) getPermitNumbers(query)
    if (attrName === BasicSearchAttributes.Media) getMediums(query)
    if (attrName === BasicSearchAttributes.ObservedPropertyGrp)
      getObservedProperties(query)
  }, 500)

  const handleInputChange = (
    e: React.SyntheticEvent,
    newVal: any,
    attrName: string,
  ) => {
    debounceSearch(newVal, attrName)
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

  const extractFileName = (contentDisposition: string): string => {
    const regex = /filename="?([^"]+)"?/
    const match = contentDisposition ? contentDisposition.match(regex) : null
    return match ? match[1] : ""
  }

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
