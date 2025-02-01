import { Info } from "@mui/icons-material"
import { IconButton, Tooltip } from "@mui/material"

export default function TooltipInfo(props: any) {
  const { title } = props

  return (
    <>
      <Tooltip title={title} sx={{ color: "#0B5394" }}>
        <IconButton>
          <Info />
        </IconButton>
      </Tooltip>
    </>
  )
}
