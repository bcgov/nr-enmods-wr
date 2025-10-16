import Btn from "@/components/Btn"
import { Link } from "react-router-dom"
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  TextField,
} from "@mui/material"
import { GridExpandMoreIcon } from "@mui/x-data-grid"
import TitleText from "@/components/TitleText"
import LocationParametersForm from "@/components/search/LocationParametersForm"
import { useEffect, useState } from "react"
import FilterResultsForm from "@/components/search/FilterResultsForm"
import AdditionalCriteria from "@/components/search/AdditionalCriteria"
import { SearchAttr } from "@/enum/searchEnum"
import apiService from "@/service/api-service"
import { API_VERSION } from "@/util/utility"
import { debounce } from "lodash"
import Loading from "@/components/Loading"
import LoadingSpinner from "../components/LoadingSpinner"
import { InfoOutlined } from "@mui/icons-material"
import type AdvanceSearchFormType from "@/interfaces/AdvanceSearchFormType"
import DownloadReadyDialog from "@/components/search/DownloadReadyDialog"
import config from "@/config"

type Props = {}

const AdvanceSearch = (props: Props) => {
  const apiBase = config.API_BASE_URL
    ? config.API_BASE_URL
    : import.meta.env.DEV
      ? "http://localhost:3000/api"
      : ""

  const [errors, setErrors] = useState<string[]>([])
  const [isDisabled, setIsDisabled] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isApiLoading, setIsApiLoading] = useState(false)
  const [locationTypes, setLocationTypes] = useState([])
  const [locationNames, setLocationNames] = useState([])
  const [permitNumbers, setPermitNumbers] = useState([])
  const [projects, setProjects] = useState([])
  const [locationGroups, setLocationGroups] = useState([])
  const [observeredProperties, setObservedProperties] = useState([])
  const [observedPropGroups, setObservedPropGroups] = useState([])
  const [workedOrderNos, setWorkedOrderNos] = useState([])
  const [analyzingAgencies, setAnalyzingAgencies] = useState([])
  const [analyticalMethods, setAnalyticalMethods] = useState([])
  const [samplingAgencies, setSamplingAgencies] = useState([])
  const [mediums, setMediums] = useState([])
  const [collectionMethods, setCollectionMethods] = useState([])
  const [qcSampleTypes, setQcSampleTypes] = useState([])
  const [dataClassifications, setDataClassifications] = useState([])
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  const [params, setParams] = useState<any>("")

  const [formData, setFormData] = useState<AdvanceSearchFormType>({
    observationIds: [],
    locationName: [],
    locationType: null,
    permitNumber: [],
    media: [],
    observedPropertyGrp: [],
    observedProperty: [],
    workedOrderNo: null,
    samplingAgency: [],
    analyzingAgency: [],
    projects: [],
    analyticalMethod: [],
    collectionMethod: [],
    qcSampleType: [],
    dataClassification: [],
    sampleDepth: "",
    labBatchId: "",
    specimenId: "",
    fromDate: null,
    toDate: null,
  })

  useEffect(() => {
    setIsApiLoading(true)
    Promise.all([
      getDropdownOptions(SearchAttr.ObservedPropertyGrp, ""),
      getDropdownOptions(SearchAttr.Media, ""),
      getDropdownOptions(SearchAttr.PermitNo, ""),
      getDropdownOptions(SearchAttr.LocationName, ""),
      getDropdownOptions(SearchAttr.LocationType, ""),
      getDropdownOptions(SearchAttr.Projects, ""),
      getDropdownOptions(SearchAttr.LocationGroup, ""),
      getDropdownOptions(SearchAttr.WorkedOrderNo, ""),
      getDropdownOptions(SearchAttr.ObservedProperty, ""),
      getDropdownOptions(SearchAttr.SamplingAgency, ""),
      getDropdownOptions(SearchAttr.AnalyzingAgency, ""),
      getDropdownOptions(SearchAttr.AnalyticalMethod, ""),
      getDropdownOptions(SearchAttr.CollectionMethod, ""),
      getDropdownOptions(SearchAttr.QcSampleType, ""),
      getDropdownOptions(SearchAttr.DataClassification, ""),
    ]).finally(() => setIsApiLoading(false))
  }, [])

  useEffect(() => {
    let params = prepareFormData(formData)
    params = {
      ...params,
      locationName: params.locationName.toString(),
      locationType: params.locationType ? params.locationType?.id : "",
      permitNumber: params.permitNumber.toString(),
      media: params.media.toString(),
      observedPropertyGrp: params.observedPropertyGrp.toString(),
      observedProperty: params.observedProperty.toString(),
      workedOrderNo: params.workedOrderNo?.id || "",
      samplingAgency: params.samplingAgency.toString(),
      analyzingAgency: params.analyzingAgency.toString(),
      projects: params.projects.toString(),
      analyticalMethod: params.analyticalMethod.toString(),
      collectionMethod: params.collectionMethod.toString(),
      qcSampleType: params.qcSampleType.toString(),
      dataClassification: params.dataClassification.toString(),
      sampleDepth: params?.sampleDepth,
      labBatchId: params?.labBatchId,
      specimenId: params?.specimenId,
      fromDate: params?.fromDate,
      toDate: params?.toDate,
      locationTypeCustomId: params.locationType
        ? params.locationType?.customId
        : "",
      workOrderNoText: params.workedOrderNo ? params.workedOrderNo?.text : "",
    }

    let urlString = ""
    for (const key in params) {
      if (key !== "observationIds" && params[key]) {
        urlString = urlString.concat(key, "=", params[key], "&")
      }
    }

    if (urlString) urlString = urlString.substring(0, urlString.length - 1)

    const url = urlString
      ? `${apiBase}/v1/search/downloadReport?${urlString}`
      : `${apiBase}/v1/search/downloadReport`
    setParams(encodeURI(url))
  }, [formData])

  const dropdowns = {
    location: {
      locationTypes: locationTypes,
      locationNames: locationNames,
      locationGroups: locationGroups,
      permitNumbers: permitNumbers,
    },
    filterResult: {
      mediums: mediums,
      projects: projects,
      observedPropGroups: observedPropGroups,
      observeredProperties: observeredProperties,
      workedOrderNos: workedOrderNos,
      samplingAgencies: samplingAgencies,
      analyzingAgencies: analyzingAgencies,
      analyticalMethods: analyticalMethods,
    },
    additionalCriteria: {
      collectionMethods: collectionMethods,
      qcSampleTypes: qcSampleTypes,
      dataClassifications: dataClassifications,
    },
  }

  const pollStatus = async (jobId: string) => {
    setIsPolling(true)
    let status = "pending"
    while (status === "pending") {
      try {
        const res = await apiService
          .getAxiosInstance()
          .get(`/v1/search/observationSearch/status/${jobId}`)
        status = res.data?.status
        if (status === "complete") {
          setIsDisabled(false)
          setIsApiLoading(false)
          setIsLoading(false)
          setDownloadUrl(
            `${apiBase}/v1/search/observationSearch/download/${jobId}`,
          )
          break
        } else if (status === "error") {
          setIsDisabled(false)
          setIsApiLoading(false)
          setIsLoading(false)
          setErrors([res.data.error || "Export failed"])
          break
        }
        await new Promise((r) => setTimeout(r, 200))
      } catch (err) {
        setIsLoading(false)
        setErrors(["Polling failed."])
        break
      }
    }
    setIsPolling(false)
  }

  const dropdwnUrl = (fieldName: string, query: string): string | undefined => {
    if (fieldName) {
      switch (fieldName) {
        case SearchAttr.ObservedPropertyGrp:
          return `${API_VERSION}/search/getObservedPropertyGroups`
        case SearchAttr.Media:
          return `${API_VERSION}/search/getMediums`
        case SearchAttr.PermitNo:
          return `${API_VERSION}/search/getLocationGroups`
        case SearchAttr.LocationName:
          return `${API_VERSION}/search/getLocationNames`
        case SearchAttr.LocationType:
          return `${API_VERSION}/search/getLocationTypes`
        case SearchAttr.Projects:
          return `${API_VERSION}/search/getProjects`
        case SearchAttr.AnalyticalMethod:
          return `${API_VERSION}/search/getAnalyticalMethods`
        case SearchAttr.AnalyzingAgency:
          return `${API_VERSION}/search/getAnalyzingAgencies`
        case SearchAttr.ObservedProperty:
          return `${API_VERSION}/search/getObservedProperties`
        case SearchAttr.WorkedOrderNo:
          return `${API_VERSION}/search/getWorkedOrderNos`
        case SearchAttr.SamplingAgency:
          return `${API_VERSION}/search/getSamplingAgencies`
        case SearchAttr.CollectionMethod:
          return `${API_VERSION}/search/getCollectionMethods`
        case SearchAttr.QcSampleType:
          return `${API_VERSION}/search/getQcSampleTypes`
        case SearchAttr.DataClassification:
          return `${API_VERSION}/search/getDataClassifications`
        default:
          break
      }
    }
  }
  const getDropdownOptions = async (
    fieldName: string,
    query: string,
  ): Promise<void> => {
    try {
      setIsApiLoading(true)
      const url = dropdwnUrl(fieldName, query)
      if (url) {
        const apiData = await apiService.getAxiosInstance().get(url)

        if (apiData?.status === 200) {
          setErrors([])
          let response = apiData.data
          if (!Array.isArray(response)) {
            response = []
          }
          switch (fieldName) {
            case SearchAttr.ObservedPropertyGrp:
              setObservedPropGroups(response)
              break
            case SearchAttr.Media:
              setMediums(response)
              break
            case SearchAttr.PermitNo:
              setPermitNumbers(response)
              break
            case SearchAttr.LocationName:
              setLocationNames(response)
              break
            case SearchAttr.LocationType:
              setLocationTypes(response)
              break
            case SearchAttr.Projects:
              setProjects(response)
              break
            case SearchAttr.LocationGroup:
              setLocationGroups(response)
              break
            case SearchAttr.WorkedOrderNo:
              setWorkedOrderNos(response)
              break
            case SearchAttr.ObservedProperty:
              setObservedProperties(response)
              break
            case SearchAttr.SamplingAgency:
              setSamplingAgencies(response)
              break
            case SearchAttr.AnalyzingAgency:
              setAnalyzingAgencies(response)
              break
            case SearchAttr.AnalyticalMethod:
              setAnalyticalMethods(response)
              break
            case SearchAttr.CollectionMethod:
              setCollectionMethods(response)
              break
            case SearchAttr.QcSampleType:
              setQcSampleTypes(response)
              break
            case SearchAttr.DataClassification:
              setDataClassifications(response)
              break
            default:
              break
          }
        } else {
          setErrors(["Error! Please contact the system administrator."])
        }
      }
    } catch (err) {
      console.error(err)
    }
  }

  const clearForm = () => {
    window.scroll(0, 0)
    setErrors([])
    setFormData({
      ...formData,
      locationName: [],
      locationType: null,
      permitNumber: [],
      media: [],
      observedPropertyGrp: [],
      observedProperty: [],
      workedOrderNo: null,
      samplingAgency: [],
      analyzingAgency: [],
      projects: [],
      analyticalMethod: [],
      collectionMethod: [],
      qcSampleType: [],
      dataClassification: [],
      sampleDepth: "",
      labBatchId: "",
      specimenId: "",
      fromDate: null,
      toDate: null,
    })
  }

  const handleOnChangeDatepicker = (val: any, attrName: string) => {
    setErrors([])
    setFormData({ ...formData, [attrName]: val })
  }

  const handleOnChange = (e: any, val: any, attrName: string) => {
    setErrors([])

    if (
      attrName === SearchAttr.LabBatchId ||
      attrName === SearchAttr.SpecimenId ||
      attrName === SearchAttr.SampleDepth
    )
      val = e.target.value

    setFormData({ ...formData, [attrName]: val })
  }

  const handleInputChange = (
    e: React.ChangeEventHandler,
    newVal: any,
    attrName: string,
  ) => {
    if (attrName) debounceSearch(newVal, attrName)
  }

  const debounceSearch = debounce(async (query, attrName) => {
    setIsApiLoading(true)
    switch (attrName) {
      case SearchAttr.LocationName:
        await getDropdownOptions(SearchAttr.LocationName, query)
        break
      case SearchAttr.PermitNo:
        await getDropdownOptions(SearchAttr.PermitNo, query)
        break
      case SearchAttr.Media:
        await getDropdownOptions(SearchAttr.Media, query)
        break
      case SearchAttr.ObservedPropertyGrp:
        await getDropdownOptions(SearchAttr.ObservedPropertyGrp, query)
        break
      case SearchAttr.ObservedProperty:
        await getDropdownOptions(SearchAttr.ObservedProperty, query)
        break
      case SearchAttr.WorkedOrderNo:
        await getDropdownOptions(SearchAttr.WorkedOrderNo, query)
        break
      case SearchAttr.SamplingAgency:
        await getDropdownOptions(SearchAttr.SamplingAgency, query)
        break
      case SearchAttr.AnalyticalMethod:
        await getDropdownOptions(SearchAttr.AnalyticalMethod, query)
        break
      default:
        break
    }
    setIsApiLoading(false)
  }, 500)

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    window.scroll(0, 0)
    advanceSearch(prepareFormData(formData))
  }

  const advanceSearch = async (data: { [key: string]: any }): Promise<void> => {
    try {
      setIsDisabled(true)
      setIsLoading(true)
      const res = await apiService
        .getAxiosInstance()
        .post("/v1/search/observationSearch", data, {
          responseType: "json",
          validateStatus: () => true,
        })
      pollStatus(res.data.jobId)

      const contentType = res.headers["content-type"]
      if (
        res.status >= 200 &&
        res.status < 300 &&
        contentType &&
        contentType.includes("text/csv")
      ) {
        // Download CSV
        const text = await res.data
        let errorArr: string[] = []

        const json = JSON.parse(text)
        if (json.message) {
          errorArr = [json.message]
          setIsDisabled(false)
          setIsLoading(false)
        } else if (Array.isArray(json.error)) {
          errorArr = json.error
          setIsDisabled(false)
          setIsLoading(false)
        } else {
          setIsDisabled(true)
          setIsLoading(true)
        }

        setErrors(errorArr)
        window.scroll(0, 0)
      }
    } catch (err: any) {
      setIsDisabled(false)
      setIsLoading(false)
      console.debug(err)
      setErrors(["An unexpected error occurred..."])
      window.scroll(0, 0)
    }
  }

  const prepareFormData = (formData: { [key: string]: any }) => {
    const data = { ...formData }
    for (const key in formData) {
      if (Array.isArray(formData[key])) {
        const arr: string[] = []

        formData[key].forEach((item) => {
          if (key === SearchAttr.DataClassification)
            arr.push(item.data_classification)
          else if (key === SearchAttr.QcSampleType) arr.push(item.qc_type)
          else if (key === SearchAttr.ObservedPropertyGrp) arr.push(item.name)
          else arr.push(item.id || item.name || item.customId)
        })

        data[key] = arr
      } else if (key === "fromDate" || key === "toDate") {
        data[key] = formData[key] ? formData[key].toISOString() : ""
      }
    }
    return data
  }

  const copyText = async() => {
   try {
    await navigator.clipboard.writeText(params);
   } catch(err) {
    console.error(err)
   }
  }

  return (
    <div className="p-3">
      <Loading isLoading={isLoading} />
      <LoadingSpinner isLoading={isApiLoading} />
      <div className="flex-row px-1 py-4">
        <Link
          to="/search/basic"
          className="bg-[#fff] text-[#38598a] border rounded-md p-2 text-sm hover:bg-[#38598a] hover:text-[#fff] cursor-pointer"
        >
          Basic
        </Link>

        <Link
          to="/search/advance"
          className="bg-[#38598a] text-[#fff] border rounded-md p-2 text-sm cursor-pointer"
        >
          Advanced
        </Link>
        <DownloadReadyDialog
          open={!!downloadUrl}
          downloadUrl={downloadUrl}
          onClose={() => {
            setDownloadUrl(null)
            setIsLoading(false)
          }}
        />
      </div>
      <div>
        {errors && errors.length > 0 && (
          <Alert
            sx={{ my: 1 }}
            icon={<InfoOutlined fontSize="inherit" />}
            severity="info"
            onClose={() => setErrors([])}
          >
            <ul style={{ margin: 0 }}>
              {errors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          </Alert>
        )}
      </div>

      <form noValidate onSubmit={onSubmit}>
        <div>
          <div>
            <TitleText
              text="Specify location paramerters, data source, date range, and sampling filters to to apply
                  to the desired dataset. All fields are optional."
              variant="subtitle1"
              sx={{ p: 1 }}
            />
          </div>
          {/* Select Location Parameter  */}
          <div className="mb-1">
            <Accordion defaultExpanded>
              <AccordionSummary
                expandIcon={<GridExpandMoreIcon sx={{ color: "#fff" }} />}
                aria-controls="select-location-parameter-content"
                id="select-location-parameter"
                sx={{
                  background: "#38598a",
                  color: "#fff",
                  borderTopRightRadius: ".3rem",
                  borderTopLeftRadius: ".3rem",
                }}
              >
                <TitleText
                  variant="h6"
                  sx={{ fontWeight: 500 }}
                  text="Location Parameters"
                />
              </AccordionSummary>
              <AccordionDetails>
                <div className="mb-0">
                  <LocationParametersForm
                    formData={formData}
                    locationDropdwns={dropdowns.location}
                    handleInputChange={handleInputChange}
                    handleOnChange={handleOnChange}
                    searchType="advance"
                  />
                </div>
              </AccordionDetails>
            </Accordion>
          </div>

          {/* Filter Results */}
          <div className="mb-1">
            <Accordion>
              <AccordionSummary
                expandIcon={<GridExpandMoreIcon sx={{ color: "#fff" }} />}
                aria-controls="filter-results-content"
                id="filter-results"
                sx={{
                  background: "#38598a",
                  color: "#fff",
                  borderTopRightRadius: ".3rem",
                  borderTopLeftRadius: ".3rem",
                }}
              >
                <TitleText
                  variant="h6"
                  sx={{ fontWeight: 500 }}
                  text="Filter Results"
                />
              </AccordionSummary>
              <AccordionDetails>
                <div className="mb-0">
                  <FilterResultsForm
                    formData={formData}
                    filterResultDrpdwns={dropdowns.filterResult}
                    handleInputChange={handleInputChange}
                    handleOnChange={handleOnChange}
                    handleOnChangeDatepicker={handleOnChangeDatepicker}
                    searchType="advance"
                  />
                </div>
              </AccordionDetails>
            </Accordion>
          </div>

          {/* Additional Criteria */}
          <div className="mb-1">
            <Accordion>
              <AccordionSummary
                expandIcon={<GridExpandMoreIcon sx={{ color: "#fff" }} />}
                aria-controls="additional-criteria-content"
                id="additional-criteria"
                sx={{
                  background: "#38598a",
                  color: "#fff",
                  borderTopRightRadius: ".3rem",
                  borderTopLeftRadius: ".3rem",
                }}
              >
                <TitleText
                  variant="h6"
                  sx={{ fontWeight: 500 }}
                  text="Additional Criteria"
                />
              </AccordionSummary>
              <AccordionDetails>
                <div className="mb-0">
                  <AdditionalCriteria
                    handleInputChange={handleInputChange}
                    handleOnChange={handleOnChange}
                    handleOnChangeDatepicker={handleOnChangeDatepicker}
                    formData={formData}
                    additionalCriteriaDrpdwns={dropdowns.additionalCriteria}
                  />
                </div>
              </AccordionDetails>
            </Accordion>
          </div>
        </div>

        <div className="flex gap-2 pt-6">
          <Btn
            text={"Clear"}
            type="button"
            handleClick={clearForm}
            sx={{
              background: "#fff",
              color: "#0B5394",
              fontSize: "9pt",
              "&:hover": {
                fontWeight: 600,
              },
            }}
          />
          <Btn
            disabled={isDisabled}
            text={"Search"}
            type={"submit"}
            sx={{
              fontSize: "9pt",
              "&:hover": {
                fontWeight: 600,
              },
            }}
          />
        </div>
      </form>
      <div className="py-8 flex gap-2">
        <TextField fullWidth size="small" id="urlText" disabled value={params} />
        <Btn text={"Copy"}
            type="button"        
            handleClick={copyText}
            sx={{             
              color: "#fff",
              fontSize: "9pt",
              "&:hover": {
                fontWeight: 600,
              },
            }}/>
      </div>
    </div>
  )
}

export default AdvanceSearch
