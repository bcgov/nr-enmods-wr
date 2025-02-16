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
import debounce from "lodash/debounce"
import { BasicSearchAttr } from "@/enum/basicSearchEnum"
import { API_VERSION, extractFileName } from "@/util/utility"
import { InfoOutlined } from "@mui/icons-material"
import Loading from "@/components/Loading"

const BasicSearch = () => {
  const [isDisabled, setIsDisabled] = useState(false)
  const [locationTypes, setLocationTypes] = useState([])
  const [locationNames, setLocationNames] = useState([])
  const [permitNumbers, setPermitNumbers] = useState([])
  const [projects, setProjects] = useState([])
  const [mediums, setMediums] = useState([])
  const [errors, setErrors] = useState([])
  const [observedProperties, setObservedProperties] = useState([])
  const [alertMsg, setAlertMsg] = useState("")
  const [isLoading, setIsLoading] = useState(false)
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
        case BasicSearchAttr.ObservedPropertyGrp:
          return `${API_VERSION}/search/getObservedProperties?search=${query}`
        case BasicSearchAttr.Media:
          return `${API_VERSION}/search/getMediums?search=${query}`
        case BasicSearchAttr.PermitNo:
          return `${API_VERSION}/search/getPermitNumbers?search=${query}`
        case BasicSearchAttr.LocationName:
          return `${API_VERSION}/search/getLocationNames?search=${query}`
        case BasicSearchAttr.LocationType:
          return `${API_VERSION}/search/getLocationTypes`
        case BasicSearchAttr.Projects:
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
      const url = dropdwnUrl(fieldName, query)
      if (url) {
        const apiData = await apiService.getAxiosInstance().get(url)
        if (apiData.status === 200) {
          const response = apiData.data
          switch (fieldName) {
            case BasicSearchAttr.ObservedPropertyGrp:
              setObservedProperties(response)
              break
            case BasicSearchAttr.Media:
              setMediums(response)
              break
            case BasicSearchAttr.PermitNo:
              setPermitNumbers(response)
              break
            case BasicSearchAttr.LocationName:
              setLocationNames(response)
              break
            case BasicSearchAttr.LocationType:
              setLocationTypes(response)
              break
            case BasicSearchAttr.Projects:
              setProjects(response)
              break
            default:
              break
          }
        }
      }
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    getDropdownOptions(BasicSearchAttr.ObservedPropertyGrp, "")
    getDropdownOptions(BasicSearchAttr.Media, "")
    getDropdownOptions(BasicSearchAttr.PermitNo, "")
    getDropdownOptions(BasicSearchAttr.LocationName, "")
    getDropdownOptions(BasicSearchAttr.LocationType, "")
    getDropdownOptions(BasicSearchAttr.Projects, "")
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
    switch (attrName) {
      case BasicSearchAttr.LocationName:
        getDropdownOptions(BasicSearchAttr.LocationName, query)
        break
      case BasicSearchAttr.PermitNo:
        getDropdownOptions(BasicSearchAttr.PermitNo, query)
        break
      case BasicSearchAttr.Media:
        getDropdownOptions(BasicSearchAttr.Media, query)
        break
      case BasicSearchAttr.ObservedPropertyGrp:
        getDropdownOptions(BasicSearchAttr.ObservedPropertyGrp, query)
        break
      default:
        break
    }
  }, 500)

  const handleInputChange = (
    e: React.ChangeEventHandler,
    newVal: any,
    attrName: string,
  ) => {
    if (attrName) debounceSearch(newVal, attrName)
  }

  const basicSearch = async (): Promise<void> => {
    setIsDisabled(true)
    setIsLoading(true)
    try {
      const res = await apiService
        .getAxiosInstance()
        .post("/v1/search/basicSearch", formData)

      window.scroll(0, 0)
      if (res.status === 200) {
        console.log(res)
        if (res.data.message) {
          setAlertMsg(res.data.message)
        } else {
          const url = window.URL.createObjectURL(new Blob([res.data]))
          const link = document.createElement("a")
          link.href = url
          link.download = extractFileName(res.headers["content-disposition"])
          link.click()
          window.URL.revokeObjectURL(url)
        }
      } else {
        setErrors(res.data.error)
      }
      setIsDisabled(false)
      setIsLoading(false)
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

  return (
    <div className="p-2">
      <Loading isLoading={isLoading} />

      <div className="flex flex-row">
        <Link to="/search/basic" className="search-btn">
          Basic
        </Link>

        <Link to="/search/advance" className="search-btn">
          Advance
        </Link>
      </div>

      <div className="py-4">
        <TitleText
          variant="subtitle1"
          text="Download Water Quality Data"
          sx={{ fontWeight: 700 }}
        />
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
          <div className="mb-5">
            <Paper elevation={2}>
              <LocationParametersForm
                formData={formData}
                locationTypes={locationTypes}
                locationNames={locationNames}
                handleInputChange={handleInputChange}
                permitNumbers={permitNumbers}
                handleOnChange={handleOnChange}
              />
            </Paper>
          </div>
          <div className="mb-5">
            <Paper elevation={2}>
              <FilterResultsForm
                formData={formData}
                mediums={mediums}
                observedProperties={observedProperties}
                projects={projects}
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
              sx={{ background: "#fff", color: "#0B5394", fontSize: "8pt" }}
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
