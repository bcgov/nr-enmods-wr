import Btn from "@/components/Btn"
import { Link } from "react-router-dom"
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
} from "@mui/material"
import { GridExpandMoreIcon } from "@mui/x-data-grid"
import TitleText from "@/components/TitleText"
import LocationParametersForm from "@/components/search/LocationParametersForm"
import { useEffect, useState } from "react"
import FilterResultsForm from "@/components/search/FilterResultsForm"
import AdditionalCriteria from "@/components/search/AdditionalCriteria"
import { SearchAttr } from "@/enum/searchEnum"
import apiService from "@/service/api-service"
import { API_VERSION, extractFileName } from "@/util/utility"
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
  const [alertMsg, setAlertMsg] = useState("")
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
  const [sampleDepths, setSampleDepths] = useState([])
  const [specimenIds, setSpecimenIds] = useState([])
  const [units, setUnits] = useState([])
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [isPolling, setIsPolling] = useState(false)

  const [formData, setFormData] = useState<AdvanceSearchFormType>({
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
    units: null,
    qcSampleType: [],
    dataClassification: [],
    sampleDepth: null,
    labBatchId: "",
    specimenId: [],
    fromDate: null,
    toDate: null,
    labArrivalFromDate: null,
    labArrivalToDate: null,
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
      getDropdownOptions(SearchAttr.Units, ""),
      getDropdownOptions(SearchAttr.QcSampleType, ""),
      getDropdownOptions(SearchAttr.DataClassification, ""),
      getDropdownOptions(SearchAttr.SampleDepth, ""),
      getDropdownOptions(SearchAttr.SpecimenId, ""),
    ]).finally(() => setIsApiLoading(false))
  }, [])

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
      sampleDepths: sampleDepths,
      specimenIds: specimenIds,
      units: units,
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
        status = res.data.status
        if (status === "complete") {
          setIsDisabled(false)
          setIsLoading(false)
          setDownloadUrl(
            `${apiBase}/v1/search/observationSearch/download/${jobId}`,
          )
          break
        } else if (status === "error") {
          setIsDisabled(false)
          setIsLoading(false)
          setErrors([res.data.error || "Export failed"])
          break
        }
        await new Promise((r) => setTimeout(r, 200))
      } catch (err) {
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
          return `${API_VERSION}/search/getObservedPropertyGroups?search=${query}`
        case SearchAttr.Media:
          return `${API_VERSION}/search/getMediums?search=${query}`
        case SearchAttr.PermitNo:
          return `${API_VERSION}/search/getPermitNumbers?search=${query}`
        case SearchAttr.LocationName:
          return `${API_VERSION}/search/getLocationNames?search=${query}`
        case SearchAttr.LocationType:
          return `${API_VERSION}/search/getLocationTypes`
        case SearchAttr.Projects:
          return `${API_VERSION}/search/getProjects?search=${query}`
        case SearchAttr.AnalyticalMethod:
          return `${API_VERSION}/search/getAnalyticalMethods?search=${query}`
        case SearchAttr.AnalyzingAgency:
          return `${API_VERSION}/search/getAnalyzingAgencies?search=${query}`
        case SearchAttr.ObservedProperty:
          return `${API_VERSION}/search/getObservedProperties?search=${query}`
        case SearchAttr.WorkedOrderNo:
          return `${API_VERSION}/search/getWorkedOrderNos?search=${query}`
        case SearchAttr.SamplingAgency:
          return `${API_VERSION}/search/getSamplingAgencies?search=${query}`
        case SearchAttr.CollectionMethod:
          return `${API_VERSION}/search/getCollectionMethods?search=${query}`
        case SearchAttr.Units:
          return `${API_VERSION}/search/getUnits?search=${query}`
        case SearchAttr.QcSampleType:
          return `${API_VERSION}/search/getQcSampleTypes?search=${query}`
        case SearchAttr.DataClassification:
          return `${API_VERSION}/search/getDataClassifications?search=${query}`
        case SearchAttr.SampleDepth:
          return `${API_VERSION}/search/getSampleDepths?search=${query}`
        case SearchAttr.SpecimenId:
          return `${API_VERSION}/search/getSpecimenIds?search=${query}`
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
        if (apiData.status === 200) {
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
            case SearchAttr.Units:
              setUnits(response)
              break
            case SearchAttr.QcSampleType:
              setQcSampleTypes(response)
              break
            case SearchAttr.DataClassification:
              setDataClassifications(response)
              break
            case SearchAttr.SampleDepth:
              setSampleDepths(response)
              break
            case SearchAttr.SpecimenId:
              setSpecimenIds(response)
              break
            default:
              break
          }
        } else {
          setErrors([
            "ENMODS service is currently down. Please contact the system administrator.",
          ])
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsApiLoading(false)
    }
  }

  const clearForm = () => {
    window.scroll(0, 0)
    setAlertMsg("")
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
      units: null,
      qcSampleType: [],
      dataClassification: [],
      sampleDepth: null,
      labBatchId: "",
      specimenId: [],
      fromDate: null,
      toDate: null,
      labArrivalFromDate: null,
      labArrivalToDate: null,
    })
  }

  const handleOnChangeDatepicker = (val: any, attrName: string) => {
    setErrors([])
    setAlertMsg("")
    setFormData({ ...formData, [attrName]: val })
  }

  const handleOnChange = (e: any, val: any, attrName: string) => {
    setErrors([])
    setAlertMsg("")

    if (attrName === SearchAttr.LabBatchId) val = e.target.value

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
      case SearchAttr.SpecimenId:
        await getDropdownOptions(SearchAttr.SpecimenId, query)
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
      console.log(err)
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
            arr.push(item.dataClassification)
          else if (key === SearchAttr.SampleDepth) arr.push(item.depth.value)
          else if (key === SearchAttr.QcSampleType) arr.push(item.type)
          else if (key === SearchAttr.SamplingAgency) arr.push(item.customId)
          else arr.push(item.id)
        })

        data[key] = arr
      }
    }
    return data
  }

  return (
    <div className="p-3">
      <LoadingSpinner isLoading={isApiLoading} />
      <Loading isLoading={isLoading} />
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
          Advance
        </Link>
        <DownloadReadyDialog
          open={!!downloadUrl}
          downloadUrl={downloadUrl}
          onClose={() => setDownloadUrl(null)}
        />
      </div>
      <form noValidate onSubmit={onSubmit}>
        <div>
          <div>
            {errors && errors.length > 0 && (
              <Alert
                sx={{ my: 1 }}
                icon={<InfoOutlined fontSize="inherit" />}
                severity="info"
                onClose={() => setErrors([])}
              >
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {errors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </Alert>
            )}
          </div>
          <div>
            <TitleText
              text="Specify location paramerters, data source, date range, and sampling filters to to apply
                  to the desired dataset. All fields are optional."
              variant="subtitle1"
              sx={{ p: 1 }}
            />
          </div>
          {/* Select Location Parameter  */}
          <Accordion defaultExpanded>
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
                text="Select Filter Results"
              />
            </AccordionSummary>
            <AccordionDetails>
              <div className="mb-5">
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
                text="Select Additional Criteria"
              />
            </AccordionSummary>
            <AccordionDetails>
              <AdditionalCriteria
                handleInputChange={handleInputChange}
                handleOnChange={handleOnChange}
                handleOnChangeDatepicker={handleOnChangeDatepicker}
                formData={formData}
                additionalCriteriaDrpdwns={dropdowns.additionalCriteria}
              />
            </AccordionDetails>
          </Accordion>
        </div>

        <div className="flex flex-row pt-6 ">
          <Btn
            text={"Clear Search"}
            type="button"
            handleClick={clearForm}
            sx={{
              background: "#fff",
              color: "#0B5394",
              fontSize: "8pt",
              "&:hover": {
                color: "#fff",
              },
            }}
          />
          <Btn
            disabled={isDisabled}
            text={"Search"}
            type={"submit"}
            sx={{ fontSize: "8pt" }}
          />
        </div>
      </form>
    </div>
  )
}

export default AdvanceSearch
