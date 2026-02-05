/**
 * Advanced Search Page Component
 *
 * A comprehensive search interface for querying environmental observations with
 * granular filtering options across multiple dimensions (location, properties,
 * agencies, methods, and additional criteria).
 *
 * Features:
 * - Multi-field search across 20+ dropdown and text input fields
 * - Accordion-based grouping of search criteria for better UX
 * - Real-time form validation with error messaging
 * - Asynchronous job-based export with polling for completion
 * - Redux-based dropdown caching to avoid redundant API calls
 * - Download-ready dialog for exporting search results
 * - Last sync time display for data freshness
 *
 * Architecture:
 * - Uses useDropdowns() hook to access cached dropdown data from Redux
 * - Maintains local form state for search parameters
 * - Generates encoded download URLs based on current form data
 * - Implements polling mechanism to monitor async export jobs
 *
 * @component
 * @returns {JSX.Element} Advanced search form with results download capability
 */
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
import { useSelector } from "react-redux"
import FilterResultsForm from "@/components/search/FilterResultsForm"
import AdditionalCriteria from "@/components/search/AdditionalCriteria"
import { SearchAttr } from "@/enum/searchEnum"
import apiService from "@/service/api-service"
import { debounce } from "lodash"
import Loading from "@/components/Loading"
import { InfoOutlined } from "@mui/icons-material"
import type AdvanceSearchFormType from "@/interfaces/AdvanceSearchFormType"
import DownloadReadyDialog from "@/components/search/DownloadReadyDialog"
import config from "@/config"
import SyncIcon from "@mui/icons-material/Sync"
import { useDropdowns } from "@/store/useDropdowns"

type Props = {}

/**
 * AdvanceSearch component - provides advanced search capabilities for environmental data
 *
 * @param {Props} props - Component props (currently unused)
 * @returns {JSX.Element} Advanced search interface
 */
const AdvanceSearch = (props: Props) => {
  const apiBase = config.API_BASE_URL
    ? config.API_BASE_URL
    : import.meta.env.DEV
      ? "http://localhost:3000/api"
      : ""

  // Load all dropdown data from Redux cache to avoid redundant API calls
  // These dropdowns were pre-fetched on app initialization via fetchAllDropdowns thunk
  const {
    locationTypes,
    locationNames,
    permitNumbers,
    projects,
    locationGroups,
    observedProperties,
    workedOrderNos,
    analyzingAgencies,
    analyticalMethods,
    samplingAgencies,
    mediums,
    collectionMethods,
    qcSampleTypes,
    dataClassifications,
    isLoading: isDropdownsLoading,
  } = useDropdowns()

  // Form state management
  const [errors, setErrors] = useState<string[]>([])
  const [isDisabled, setIsDisabled] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  const [params, setParams] = useState<any>("")
  const [lastSearchParams, setLastSearchParams] = useState<any>(null)

  // Get last sync time from Redux store (cached, no repeated API calls)
  const lastSyncTime = useSelector((state: any) => state.syncInfo.lastSyncTime)

  // Initialize form with empty values for all search fields
  const [formData, setFormData] = useState<AdvanceSearchFormType>({
    observationIds: [],
    locationName: [],
    locationType: null,
    permitNumber: [],
    media: [],
    observedProperty: [],
    workedOrderNo: [],
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
    let params = prepareFormData(formData)
    params = {
      ...params,
      locationName: params.locationName.toString(),
      locationType: params.locationType ? params.locationType?.id : "",
      permitNumber: params.permitNumber.toString(),
      media: params.media.toString(),
      observedProperty: params.observedProperty.toString(),
      workedOrderNo: Array.isArray(params.workedOrderNo)
        ? params.workedOrderNo.map((wo: any) => wo?.id || "").join(",")
        : params.workedOrderNo?.id || "",
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
      workOrderNoText: Array.isArray(params.workedOrderNo)
        ? params.workedOrderNo.map((wo: any) => wo?.text || "").join(", ")
        : params.workedOrderNo
          ? params.workedOrderNo?.text
          : "",
    }

    let urlString = ""
    for (const key in params) {
      if (key !== "observationIds" && params[key]) {
        urlString = urlString.concat(key, "=", params[key], "&")
      }
    }

    if (urlString) urlString = urlString.substring(0, urlString.length - 1)

    // Build full absolute URL for browser-friendly sharing
    const protocol = window.location.protocol
    const host = window.location.host
    const url = urlString
      ? `${protocol}//${host}/api/v1/search/downloadReport?${urlString}`
      : `${protocol}//${host}/api/v1/search/downloadReport`
    setParams(encodeURI(url))
  }, [formData])

  useEffect(() => {
    // Last sync time is now fetched once at app initialization and cached in Redux
    // No need to fetch it again here
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
      observeredProperties: observedProperties,
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

  // Format sync time for Pacific Time
  const formattedSyncTime = lastSyncTime
    ? new Date(lastSyncTime).toLocaleString("en-US", {
        timeZone: "America/Los_Angeles",
      })
    : ""

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
          setIsLoading(false)
          setDownloadUrl(
            `${apiBase}/v1/search/observationSearch/download/${jobId}`,
          )
          // Update search params with statistics from status response
          if (res.data.statistics) {
            setLastSearchParams((prev: any) => ({
              ...prev,
              statistics: res.data.statistics,
            }))
          }
          break
        } else if (status === "error") {
          setIsDisabled(false)
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

  const clearForm = () => {
    window.scroll(0, 0)
    setErrors([])
    setFormData({
      ...formData,
      locationName: [],
      locationType: null,
      permitNumber: [],
      media: [],
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
    // Debounce is no longer needed for dropdowns since they're loaded from Redux
    // Keep the function signature for compatibility with handleInputChange
  }, 500)

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    window.scroll(0, 0)
    const preparedData = prepareFormData(formData)
    setLastSearchParams(preparedData)
    advanceSearch(preparedData)
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
          else arr.push(item.id || item.name || item.customId)
        })

        data[key] = arr
      } else if (key === "fromDate" || key === "toDate") {
        data[key] = formData[key] ? formData[key].toISOString() : ""
      } else if (key === SearchAttr.WorkedOrderNo && formData[key]) {
        // Wrap single workedOrderNo object in array
        data[key] = [formData[key]]
      }
    }
    return data
  }

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(params)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="p-3">
      <Loading
        isLoading={isLoading}
        loadingText="Please wait while your data is being processed..."
      />
      <div className="flex-row px-1 py-4">
        <Link
          to="/search/basic"
          className="bg-[#fff] text-[#38598b] border rounded-md p-2 text-sm hover:bg-[#38598a] hover:text-[#fff] cursor-pointer"
        >
          Basic
        </Link>

        <Link
          to="/search/advance"
          className="bg-[#38598a] text-[#fff] border rounded-md p-2 text-sm cursor-pointer"
        >
          Advanced
        </Link>

        <div className="ml-auto text-sm italic text-gray-600 self-center">
          <SyncIcon sx={{ mr: 1, fontSize: "1rem" }} />
          Last Synced: {formattedSyncTime} (PST)
        </div>

        <DownloadReadyDialog
          open={!!downloadUrl}
          downloadUrl={downloadUrl}
          onClose={() => {
            setDownloadUrl(null)
            setIsLoading(false)
          }}
          searchParams={lastSearchParams}
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
        <TextField
          fullWidth
          size="small"
          id="urlText"
          disabled
          value={params}
          helperText="Copy this URL and paste it into your browser's address bar to download the CSV file directly without using the UI. The file will be generated automatically."
        />
        <Btn
          text={"Copy"}
          type="button"
          handleClick={copyText}
          sx={{
            color: "#fff",
            fontSize: "9pt",
            "&:hover": {
              fontWeight: 600,
            },
          }}
        />
      </div>
    </div>
  )
}

export default AdvanceSearch
