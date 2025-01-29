import TitleText from "../TitleText"
import TooltipInfo from "../TooltipInfo"
import { TextField } from "@mui/material"

export default function FilterResultsForm(props: any) {
  const { formData, handleOnChange } = props

  return (
    <>
      <p>
        Specify data source, date range, and sampling filters to apply to the
        desired dataset. Additional options are available in the
        <a href="#"> Advance</a> fields are optional
      </p>

      <div>
        <div className="flex-row">
          <TitleText
            variant="subtitle1"
            text="Date Range"
            sx={{ fontWeight: 600 }}
          />
          <TooltipInfo title="Date Range" />
        </div>
        <div>
          <TitleText
            variant="body2"
            sx={{ fontSize: "8pt" }}
            text="Dates should be entered as mm-dd-yyyy, mm-yyyy, or yyyy"
          />
        </div>
        <div>
          <TitleText variant="body2" text="from:" sx={{ fontSize: "9pt" }} />
        </div>
        <div>
          <TextField
            variant="outlined"
            size="small"
            name="dateFrom"
            value={formData.dateFrom}
            onChange={handleOnChange}
          />
        </div>
        <div>
          <TitleText variant="body2" text="to:" sx={{ fontSize: "9pt" }} />
        </div>
        <div>
          <TextField
            variant="outlined"
            size="small"
            name="dateTo"
            value={formData.dateTo}
            onChange={handleOnChange}
          />
        </div>
        <div className="flex-row">
          <TitleText
            variant="subtitle1"
            text="Media"
            sx={{ fontWeight: 600 }}
          />
          <TooltipInfo title="Media" />
        </div>
        <div>
          <TextField
            variant="outlined"
            size="small"
            name="media"
            value={formData.media}
            onChange={handleOnChange}
          />
        </div>
        <div className="flex-row">
          <TitleText
            variant="subtitle1"
            text="Observed Property Group"
            sx={{ fontWeight: 600 }}
          />
          <TooltipInfo title="Observed Property Group" />
        </div>
        <div>
          <TextField
            variant="outlined"
            size="small"
            name="observedPropertyGrp"
            value={formData.observedPropertyGrp}
            onChange={handleOnChange}
          />
        </div>
      </div>
    </>
  )
}
