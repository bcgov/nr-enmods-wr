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
        .post("/v1/search/observationSearch", data, {
          responseType: "blob",
          validateStatus: () => true,
        })

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
        // Download CSV
        clearForm()
        const url = window.URL.createObjectURL(res.data)
        const link = document.createElement("a")
        link.href = url
        link.download = extractFileName(res.headers["content-disposition"])
        link.click()
        window.URL.revokeObjectURL(url)
        setErrors([]) // clear errors on success
      } else {
        // Parse JSON message or error
        const text = await res.data.text()
        console.debug(`Response text: ${text}`)
        let errorArr: string[] = []
        try {
          const json = JSON.parse(text)
          if (json.message) {
            errorArr = [json.message]
          } else if (Array.isArray(json.error)) {
            errorArr = json.error
          } else {
            errorArr = ["An unexpected error occurred."]
          }
        } catch {
          errorArr = ["An unexpected error occurred."]
        }
        setErrors(errorArr)
        window.scroll(0, 0)
      }
      setIsDisabled(false)
      setIsLoading(false)
    } catch (err: any) {
      setIsDisabled(false)
      setIsLoading(false)
      setErrors(["An unexpected error occurred."])
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
