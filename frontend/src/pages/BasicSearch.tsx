/**
 * Basic Search Page Component
 *
 * A simplified search interface for querying environmental observations with
 * essential filtering criteria (location, media, properties, projects, and date range).
 *
 * Features:
 * - Easy-to-use search form with core filtering options
 * - Date range filtering for temporal queries
 * - Multiple file format export options
 * - Asynchronous job-based export with polling for completion
 * - Redux-based dropdown caching to avoid redundant API calls
 * - Download-ready dialog for exporting search results
 * - Last sync time display for data freshness
 *
 * Architecture:
 * - Uses useDropdowns() hook to access cached dropdown data from Redux
 * - Maintains local form state for search parameters
 * - Implements polling mechanism to monitor async export jobs
 * - Provides debounced input handling for form changes
 *
 * @component
 * @returns {JSX.Element} Basic search form with results download capability
 */
import Btn from "@/components/Btn"
import TitleText from "@/components/TitleText"
import { Alert, Paper } from "@mui/material"
import LocationParametersForm from "@/components/search/LocationParametersForm"
import FilterResultsForm from "@/components/search/FilterResultsForm"
import DownloadForm from "@/components/search/DownloadForm"
import { useEffect, useState } from "react"
import apiService from "@/service/api-service"
import type BasicSearchFormType from "@/interfaces/BasicSearchFormType"
import { Link } from "react-router-dom"
import { debounce } from "lodash"
import { SearchAttr } from "@/enum/searchEnum"
import { API_VERSION } from "@/util/utility"
import { InfoOutlined } from "@mui/icons-material"
import Loading from "@/components/Loading"
import LoadingSpinner from "../components/LoadingSpinner"
import config from "@/config"
import DownloadReadyDialog from "@/components/search/DownloadReadyDialog"
import SyncIcon from "@mui/icons-material/Sync"
import { useDropdowns } from "@/store/useDropdowns"

/**
 * BasicSearch component - provides simplified search capabilities for environmental data
 *
 * @returns {JSX.Element} Basic search interface
 */
const BasicSearch = () => {
  // API base URL configuration - uses environment-specific defaults
  const apiBase = config.API_BASE_URL
    ? config.API_BASE_URL
    : import.meta.env.DEV
      ? "http://localhost:3000/api"
      : ""

  // UI state management
  const [isDisabled, setIsDisabled] = useState(false) // Disable form during export
  const [errors, setErrors] = useState<string[]>([]) // Form validation errors
  const [alertMsg, setAlertMsg] = useState("") // User alert messages
  const [isLoading, setIsLoading] = useState(false) // Loading state during export
  const [isApiLoading, setIsApiLoading] = useState(false) // API request state
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null) // Download link after export
  const [lastSyncTime, setLastSyncTime] = useState(null) // Last data sync time display
  const [lastSearchParams, setLastSearchParams] = useState<any>(null) // Last search params for statistics

  // Redux-based dropdown data access
  // useDropdowns() hook provides cached dropdown options for search form fields.
  // These dropdowns are fetched once at app initialization via async thunk,
  // eliminating redundant API calls when components unmount/remount.
  const {
    locationTypes,
    locationNames,
    permitNumbers,
    projects,
    mediums,
    isLoading: isDropdownsLoading,
  } = useDropdowns()

  // Form state for basic search parameters
  // Maintains user input for all search fields (location, media, projects, date range)
  const [formData, setFormData] = useState<BasicSearchFormType>({
    locationType: null, // Selected location type for filtering
    locationName: [], // Selected location names (multi-select)
    permitNumber: [], // Selected permit numbers (multi-select)
    fromDate: null, // Start date for temporal filtering
    toDate: null, // End date for temporal filtering
    media: [], // Selected media types (water, soil, etc.)
    projects: [], // Selected projects (multi-select)
    fileFormat: null, // Export format (CSV, Excel, JSON, etc.)
  })

  /**
   * Async polling mechanism to check export job status
   *
   * Polls the backend API every 2 seconds to check if an async export job has completed.
   * Once complete, constructs download URL and extracts statistics. On error, displays error message to user.
   *
   * @param {string} jobId - The unique identifier of the export job
   */
  const pollStatus = async (jobId: string) => {
    let status = "pending"
    while (status === "pending") {
      const res = await apiService
        .getAxiosInstance()
        .get(`/v1/search/observationSearch/status/${jobId}`)
      status = res.data.status
      if (status === "complete") {
        // Export successful - enable form and provide download link
        setIsDisabled(false)
        setIsLoading(false)
        if (import.meta.env.DEV) {
          // Development-only logic
        }
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
        // Export failed - enable form and show error
        setIsDisabled(false)
        setIsLoading(false)
        setErrors([res.data.error || "Export failed"])
        break
      }
      // Poll every 2 seconds
      await new Promise((r) => setTimeout(r, 2000))
    }
  }

  /**
   * Handle dropdown/select field changes
   *
   * Clears validation errors and updates form state when user selects values.
   * Works with single-select and multi-select fields.
   *
   * @param {React.ChangeEventHandler} e - Change event
   * @param {any} val - Selected value(s)
   * @param {string} attrName - Form field attribute name
   */
  const handleOnChange = (
    e: React.ChangeEventHandler,
    val: any,
    attrName: string,
  ) => {
    setErrors([])
    setAlertMsg("")
    setFormData({ ...formData, [attrName]: val })
  }

  /**
   * Handle date picker field changes
   *
   * Updates form state for date range fields (fromDate, toDate).
   * Clears validation errors when user changes dates.
   *
   * @param {any} val - Selected date value
   * @param {string} attrName - Form field attribute name (fromDate or toDate)
   */
  const handleOnChangeDatepicker = (val: any, attrName: string) => {
    setErrors([])
    setAlertMsg("")
    setFormData({ ...formData, [attrName]: val })
  }

  /**
   * Fetch and display last data sync time from server
   *
   * Runs on component mount to show users when data was last synchronized.
   * Helps users understand data freshness.
   */
  useEffect(() => {
    const fetchLastSyncTime = async () => {
      try {
        const response = await apiService
          .getAxiosInstance()
          .get(`${API_VERSION}/s3-sync-log/last-sync-time`)
        setLastSyncTime(response.data)
      } catch (error) {
        console.error("Error fetching last sync time:", error)
      }
    }
    fetchLastSyncTime()
  }, [])

  /**
   * Debounced input handler for search fields
   *
   * Note: Debounce is no longer needed for dropdowns since they're cached in Redux
   * and loaded at app initialization. This function is kept for compatibility with
   * LocationParametersForm component signature.
   */
  const debounceSearch = debounce(async (query, attrName) => {
    // Debounce is no longer needed for dropdowns since they're loaded from Redux
    // Keep the function signature for compatibility with handleInputChange
  }, 500)

  const handleInputChange = (
    e: React.ChangeEventHandler,
    newVal: any,
    attrName: string,
  ) => {
    if (attrName) debounceSearch(newVal, attrName)
  }

  /**
   * Reset form to initial state
   *
   * Clears all form fields, validation errors, and alert messages.
   * Scrolls to top of page so user sees the cleared form.
   */
  const clearForm = () => {
    window.scroll(0, 0)
    setAlertMsg("")
    setErrors([])
    setFormData({
      ...formData,
      locationType: null,
      locationName: [],
      permitNumber: [],
      fromDate: null,
      toDate: null,
      media: [],
      projects: [],
      fileFormat: null,
    })
  }

  /**
   * Execute search and initiate async export job
   *
   * Sends search parameters to backend API which creates an async job.
   * Backend returns jobId which is used to poll for completion status.
   * Once complete, download URL is made available to user.
   *
   * @param {Object} data - Prepared form data with search parameters
   * @returns {Promise<void>}
   */
  const basicSearch = async (data: { [key: string]: any }): Promise<void> => {
    try {
      setIsDisabled(true)
      setIsLoading(true)
      const res = await apiService
        .getAxiosInstance()
        .post("/v1/search/observationSearch", data, {
          responseType: "json",
          validateStatus: () => true,
        })
      // Start polling for async export job status
      pollStatus(res.data.jobId)

      console.debug(`Status from observationSearch: ${res.status}`)
      console.debug(
        `content-type from observationSearch: ${res.headers["content-type"]}`,
      )

      const contentType = res.headers["content-type"]
      if (
        res.status >= 200 &&
        res.status < 300 &&
        contentType &&
        contentType.includes("text/csv")
      ) {
        const errorObj = res.data
        console.debug(`Response:`, errorObj)
        let errorArr: string[] = []
        if (errorObj.message) {
          errorArr = [errorObj.message]
          setIsDisabled(false)
          setIsLoading(false)
        } else if (Array.isArray(errorObj.error)) {
          errorArr = errorObj.error
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
      console.error("Error in basicSearch:", err)
      setIsDisabled(false)
      setIsLoading(false)
      setErrors(["An unexpected error occurred."])
      window.scroll(0, 0)
    }
  }

  /**
   * Transform form data for API submission
   *
   * Converts multi-select dropdown objects to arrays of IDs/names.
   * Converts date objects to ISO string format for API consumption.
   *
   * @param {Object} formData - Raw form data with dropdown objects and dates
   * @returns {Object} Prepared data ready for API submission
   */
  const prepareFormData = (formData: { [key: string]: any }) => {
    const data = { ...formData }
    for (const key in formData) {
      const arr: string[] = []
      if (Array.isArray(formData[key])) {
        formData[key].forEach((item) => {
          arr.push(item.id || item.name || item.customId)
        })
        data[key] = arr
      } else if (key === "fromDate" || key === "toDate") {
        data[key] = formData[key] ? formData[key].toISOString() : ""
      }
    }
    return data
  }

  /**
   * Handle form submission
   *
   * Prepares form data and initiates search/export process.
   *
   * @param {React.FormEvent<HTMLFormElement>} e - Form submission event
   */
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    window.scroll(0, 0)
    const preparedData = prepareFormData(formData)
    setLastSearchParams(preparedData)
    basicSearch(preparedData)
  }

  // Format sync time for Pacific Time for display to users
  const formattedSyncTime = lastSyncTime
    ? new Date(lastSyncTime).toLocaleString("en-US", {
        timeZone: "America/Los_Angeles",
      })
    : ""

  /**
   * Organize dropdown objects by form section
   *
   * Groups 6 dropdown types into location parameters and filter results sections
   * for cleaner prop passing to child form components
   */
  const dropdwns = {
    location: {
      locationTypes: locationTypes,
      locationNames: locationNames,
      permitNumbers: permitNumbers,
    },
    filterResult: {
      mediums: mediums,
      projects: projects,
    },
  }

  // UI RENDER SECTION
  // Displays form sections (location, filters, download options), loading indicators,
  // error alerts, and action buttons (Clear/Search) for user interaction
  return (
    <div className="p-3">
      {/* Loading indicators for async operations */}
      <LoadingSpinner isLoading={isApiLoading} />
      <Loading isLoading={isLoading} />

      {/* Navigation tabs: Basic (active) and Advanced search options */}
      <div className="flex flex-row px-1 py-4">
        <Link
          to="/search/basic"
          className="bg-[#38598a] text-[#fff] border rounded-md p-2 text-sm cursor-pointer"
        >
          Basic
        </Link>

        <Link
          to="/search/advance"
          className="bg-[#fff] text-[#38598a] border rounded-md p-2 text-sm hover:bg-[#38598a] hover:text-[#fff] cursor-pointer"
        >
          Advanced
        </Link>

        {/* Last sync time display - shows data freshness */}
        <div className="ml-auto text-sm italic text-gray-600 self-center">
          <SyncIcon sx={{ mr: 1, fontSize: "1rem" }} />
          Last Synced: {formattedSyncTime} (PST)
        </div>
      </div>

      {/* Download dialog appears after search completes successfully */}
      <DownloadReadyDialog
        open={!!downloadUrl}
        downloadUrl={downloadUrl}
        onClose={() => setDownloadUrl(null)}
        searchParams={lastSearchParams}
      />

      {/* Main search form */}
      <form noValidate onSubmit={onSubmit}>
        <div>
          {/* Error/info alert section */}
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

          {/* Page title */}
          <div className="py-4">
            <TitleText
              variant="h6"
              text="Download Water Quality Data"
              sx={{ fontWeight: 700 }}
            />
          </div>

          {/* Location Parameters Section */}
          <div className="mb-5">
            <div className="heading-section">
              <TitleText text={"Location Parameters"} variant="h6" />
            </div>
            <Paper elevation={2}>
              <LocationParametersForm
                formData={formData}
                handleInputChange={handleInputChange}
                handleOnChange={handleOnChange}
                locationDropdwns={dropdwns.location}
              />
            </Paper>
          </div>

          {/* Filter Results Section - media, projects, observed properties, and date range */}
          <div className="mb-5">
            <div className="heading-section">
              <TitleText text={"Filter Results"} variant="h6" />
            </div>
            <Paper elevation={2}>
              <FilterResultsForm
                formData={formData}
                filterResultDrpdwns={dropdwns.filterResult}
                handleInputChange={handleInputChange}
                handleOnChange={handleOnChange}
                handleOnChangeDatepicker={handleOnChangeDatepicker}
              />
            </Paper>
          </div>

          {/* Download Format Section - allows user to select export file format */}
          <div className="mb-5">
            <div className="heading-section">
              <TitleText text={"Download"} variant="h6" />
            </div>
            <Paper elevation={2}>
              <DownloadForm formData={formData} />
            </Paper>
          </div>

          {/* Action Buttons Section */}
          <div className="flex py-2 gap-2">
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
        </div>
      </form>
    </div>
  )
}

export default BasicSearch
