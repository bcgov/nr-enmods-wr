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
import { API_VERSION, extractFileName } from "@/util/utility"
import { InfoOutlined } from "@mui/icons-material"
import Loading from "@/components/Loading"
import LoadingSpinner from "../components/LoadingSpinner"

const BasicSearch = () => {
  const [isDisabled, setIsDisabled] = useState(false)
  const [locationTypes, setLocationTypes] = useState([])
  const [locationNames, setLocationNames] = useState([])
  const [permitNumbers, setPermitNumbers] = useState([])
  const [projects, setProjects] = useState([])
  const [mediums, setMediums] = useState([])
  const [errors, setErrors] = useState<string[]>([])
  const [observedPropGroups, setObservedPropGroups] = useState([])
  const [alertMsg, setAlertMsg] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isApiLoading, setIsApiLoading] = useState(false)

  const [formData, setFormData] = useState<BasicSearchFormType>({
    locationType: null,
    locationName: [],
    permitNumber: [],
    fromDate: null,
    toDate: null,
    media: [],
    observedPropertyGrp: [],
    projects: [],
    fileFormat: null,
  })

  const dropdwnUrl = (fieldName: string, query: string): string | undefined => {
    if (fieldName) {
      switch (fieldName) {
        case SearchAttr.ObservedPropertyGrp:
          return `${API_VERSION}/search/getObservedProperties?search=${query}`
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

  useEffect(() => {
    setIsApiLoading(true)
    Promise.all([
      getDropdownOptions(SearchAttr.ObservedPropertyGrp, ""),
      getDropdownOptions(SearchAttr.Media, ""),
      getDropdownOptions(SearchAttr.PermitNo, ""),
      getDropdownOptions(SearchAttr.LocationName, ""),
      getDropdownOptions(SearchAttr.LocationType, ""),
      getDropdownOptions(SearchAttr.Projects, ""),
    ]).finally(() => setIsApiLoading(false))
  }, [])

  const handleOnChange = (
    e: React.ChangeEventHandler,
    val: any,
    attrName: string,
  ) => {
    setErrors([])
    setAlertMsg("")
    setFormData({ ...formData, [attrName]: val })
  }
  const handleOnChangeDatepicker = (val: any, attrName: string) => {
    setErrors([])
    setAlertMsg("")
    setFormData({ ...formData, [attrName]: val })
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
      default:
        break
    }
    setIsApiLoading(false)
  }, 500)

  const handleInputChange = (
    e: React.ChangeEventHandler,
    newVal: any,
    attrName: string,
  ) => {
    if (attrName) debounceSearch(newVal, attrName)
  }

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
      observedPropertyGrp: [],
      projects: [],
      fileFormat: null,
    })
  }

  const basicSearch = async (data: { [key: string]: any }): Promise<void> => {
    try {
      setIsDisabled(true)
      setIsLoading(true)
      const res = await apiService
        .getAxiosInstance()
        .post("/v1/search/observationSearch", data, { responseType: "blob" })

      // Try to parse the blob as JSON to check for a message
      let isJson = false
      let message = ""
      try {
        const text = await res.data.text()
        const json = JSON.parse(text)
        if (json.message) {
          isJson = true
          message = json.message
        }
      } catch (parseErr) {
        // Not JSON, so it's probably the CSV file
        console.info(
          "Response is not JSON, likely a CSV file. Parse error:",
          parseErr,
        )
      }

      if (isJson) {
        setAlertMsg(message)
        window.scroll(0, 0)

        setIsDisabled(false)
        setIsLoading(false)
      } else {
        try {
          clearForm()
          const url = window.URL.createObjectURL(new Blob([res.data]))
          const link = document.createElement("a")
          link.href = url
          link.download = extractFileName(res.headers["content-disposition"])
          link.click()
          window.URL.revokeObjectURL(url)
        } catch (downloadErr) {
          console.error("Error during file download:", downloadErr)
          setAlertMsg("An error occurred while downloading the file.")
        }
        setIsDisabled(false)
        setIsLoading(false)
      }
    } catch (err: any) {
      setIsDisabled(false)
      setIsLoading(false)

      let errorArr: string[] = []
      let errorMsg = "An unexpected error occurred."

      // Axios error: err.response.data may be a Blob if responseType: 'blob'
      if (err.response && err.response.data) {
        try {
          const text = await err.response.data.text()
          const json = JSON.parse(text)
          if (Array.isArray(json.error)) {
            errorArr = json.error
            errorMsg = errorArr[0]
          } else if (json.message) {
            errorMsg = json.message
            errorArr = [json.message]
          }
        } catch (parseErr) {
          // Not JSON, fallback
          errorArr = [errorMsg]
        }
      } else {
        errorArr = [errorMsg]
      }

      setErrors(errorArr)
      setAlertMsg(errorMsg)
      window.scroll(0, 0)
    }
  }

  const prepareFormData = (formData: { [key: string]: any }) => {
    const data = { ...formData }
    for (const key in formData) {
      if (Array.isArray(formData[key])) {
        const arr: string[] = []
        formData[key].forEach((item) => {
          arr.push(item.id)
        })
        data[key] = arr
      }
    }
    return data
  }

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    basicSearch(prepareFormData(formData))
  }

  const dropdwns = {
    location: {
      locationTypes: locationTypes,
      locationNames: locationNames,
      permitNumbers: permitNumbers,
    },
    filterResult: {
      mediums: mediums,
      projects: projects,
      observedPropGroups: observedPropGroups,
    },
  }

  return (
    <div className="p-3">
      <LoadingSpinner isLoading={isApiLoading} />
      <Loading isLoading={isLoading} />

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
          Advance
        </Link>
      </div>

      {alertMsg && (
        <Alert
          sx={{ my: 1 }}
          icon={<InfoOutlined fontSize="inherit" />}
          severity="info"
          onClose={() => setAlertMsg("")}
        >
          {alertMsg}
        </Alert>
      )}

      <form noValidate onSubmit={onSubmit}>
        <div>
          <div>
            {errors.length > 0 && (
              <Alert
                sx={{ my: 1 }}
                icon={<InfoOutlined fontSize="inherit" />}
                severity="error"
                onClose={() => setErrors([])}
              >
                {errors.map((item, index) => (
                  <div key={index}>
                    <ul>
                      <li>{item}</li>
                    </ul>
                  </div>
                ))}
              </Alert>
            )}
          </div>
          <div className="py-4">
            <TitleText
              variant="subtitle1"
              text="Download Water Quality Data"
              sx={{ fontWeight: 700 }}
            />
          </div>
          <div className="mb-5">
            <Paper elevation={2}>
              <LocationParametersForm
                formData={formData}
                handleInputChange={handleInputChange}
                handleOnChange={handleOnChange}
                locationDropdwns={dropdwns.location}
              />
            </Paper>
          </div>
          <div className="mb-5">
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
          <div className="mb-5">
            <Paper elevation={2}>
              <DownloadForm formData={formData} />
            </Paper>
          </div>
          <div className="flex flex-row ">
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
              text={"Download"}
              type={"submit"}
              sx={{ fontSize: "8pt" }}
            />
          </div>
        </div>
      </form>
    </div>
  )
}

export default BasicSearch
