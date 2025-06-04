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
import { InfoOutlined } from "@mui/icons-material"

type Props = {}

const AdvanceSearch = (props: Props) => {
  const [errors, setErrors] = useState([])
  const [alertMsg, setAlertMsg] = useState("")
  const [isDisabled, setIsDisabled] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
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
  const [formData, setFormData] = useState({
    locationName: [],
    locationType: null,
    permitNumber: [],
    media: [],
    observedPropertyGrp: [],
    observedProperty: [],
    workedOrderNo: "",
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
    specimentId: [],
    fromDate: null,
    toDate: null,
    labArrivalFromDate: null,
    labArrivalToDate: null,
  })

  useEffect(() => {
    getDropdownOptions(SearchAttr.ObservedPropertyGrp, "")
    getDropdownOptions(SearchAttr.Media, "")
    getDropdownOptions(SearchAttr.PermitNo, "")
    getDropdownOptions(SearchAttr.LocationName, "")
    getDropdownOptions(SearchAttr.LocationType, "")
    getDropdownOptions(SearchAttr.Projects, "")
    getDropdownOptions(SearchAttr.LocationGroup, "")
    getDropdownOptions(SearchAttr.WorkedOrderNo, "")
    getDropdownOptions(SearchAttr.ObservedProperty, "")
    getDropdownOptions(SearchAttr.SamplingAgency, "")
    getDropdownOptions(SearchAttr.AnalyzingAgency, "")
    getDropdownOptions(SearchAttr.AnalyticalMethod, "")
    getDropdownOptions(SearchAttr.CollectionMethod, "")
    getDropdownOptions(SearchAttr.Units, "")
    getDropdownOptions(SearchAttr.QcSampleType, "")
    getDropdownOptions(SearchAttr.DataClassification, "")
    getDropdownOptions(SearchAttr.SampleDepth, "")
    getDropdownOptions(SearchAttr.SpecimenId, "")
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
      const url = dropdwnUrl(fieldName, query)
      if (url) {
        const apiData = await apiService.getAxiosInstance().get(url)
        if (apiData.status === 200) {
          const response = apiData.data
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
            case SearchAttr.LocationGroup:
              setLocationGroups(response)
              break
            case SearchAttr.Projects:
              setProjects(response)
              break
            case SearchAttr.ObservedProperty:
              setObservedProperties(response)
              break
            case SearchAttr.WorkedOrderNo:
              setWorkedOrderNos(response)
              break
            case SearchAttr.SamplingAgency:
              setSamplingAgencies(response)
              break
            case SearchAttr.AnalyticalMethod:
              setAnalyticalMethods(response)
              break
            case SearchAttr.AnalyzingAgency:
              setAnalyzingAgencies(response)
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
        }
      }
    } catch (err) {
      console.error(err)
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
      workedOrderNo: "",
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
      specimentId: [],
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
    if (attrName === SearchAttr.LabBatchId || attrName === SearchAttr.WorkedOrderNo) val = e.target.value

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
    switch (attrName) {
      case SearchAttr.LocationName:
        getDropdownOptions(SearchAttr.LocationName, query)
        break
      case SearchAttr.PermitNo:
        getDropdownOptions(SearchAttr.PermitNo, query)
        break
      case SearchAttr.Media:
        getDropdownOptions(SearchAttr.Media, query)
        break
      case SearchAttr.ObservedPropertyGrp:
        getDropdownOptions(SearchAttr.ObservedPropertyGrp, query)
        break
      case SearchAttr.AnalyticalMethod:
        getDropdownOptions(SearchAttr.AnalyticalMethod, query)
        break
      case SearchAttr.ObservedProperty:
        getDropdownOptions(SearchAttr.ObservedProperty, query)
        break
      case SearchAttr.SamplingAgency:
        getDropdownOptions(SearchAttr.SamplingAgency, query)
        break
      default:
        break
    }
  }, 500)

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    advanceSearch(prepareFormData(formData))
  }

  const advanceSearch = async (data: { [key: string]: any }): Promise<void> => {
    setIsDisabled(true)
    setIsLoading(true)
    console.log(data)
    try {
      const res = await apiService
        .getAxiosInstance()
        .post("/v1/search/observationSearch", data)

      if (res.status === 200) {
        window.scroll(0, 0)
        console.log(res)
        if (res.data.message) {
          setAlertMsg(res.data.message)
        } else {
          clearForm()
          const url = window.URL.createObjectURL(new Blob([res.data]))
          const link = document.createElement("a")
          link.href = url
          link.download = extractFileName(res.headers["content-disposition"])
          link.click()
          window.URL.revokeObjectURL(url)
        }
      } else {
        window.scroll(0, 0)
        console.log(res)
        setErrors(res.data.error)
      }
      setIsDisabled(false)
      setIsLoading(false)
    } catch (err) {
      console.error(err)
    }
  }

  const prepareFormData = (formData: { [key: string]: any }) => {
    const data = { ...formData }
    for (const key in formData) {
      if (Array.isArray(formData[key])) {
        const arr: string[] = []

        formData[key].forEach((item) => {
          if (key === SearchAttr.DataClassification) arr.push(item.dataClassification)
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
    <>
      <div className="p-2">
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
                <TitleText
                  text="Specify location paramerters to describe the spatial extent of
                  the desired dataset. All fields are optional."
                  variant="subtitle1"
                  sx={{ p: 1 }}
                />

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
            <Accordion defaultExpanded>
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
                <TitleText
                  text="Specify data source, date range, and sampling filters to apply
                  to the desired dataset. All fields are optional."
                  variant="subtitle1"
                  sx={{ p: 1 }}
                />

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
            <Accordion defaultExpanded>
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
                <TitleText
                  text="Specify data source, date range, and sampling filters to apply
                  to the desired dataset. All fields are optional."
                  variant="subtitle1"
                  sx={{ p: 1 }}
                />

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
              sx={{ background: "#fff", color: "#0B5394", fontSize: "8pt" }}
            />
            <Btn
              disabled={isDisabled}
              text={"Download"}
              type={"submit"}
              sx={{ fontSize: "8pt" }}
            />
          </div>
        </form>
      </div>
    </>
  )
}

export default AdvanceSearch
