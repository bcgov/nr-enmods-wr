import { Info } from "@mui/icons-material"
import { IconButton, Tooltip } from "@mui/material"

export default function TooltipInfo(props: any) {
  const { title } = props

  return (
    <>
      <Tooltip title={title}>
        <IconButton>
          <Info />
        </IconButton>
      </Tooltip>
    </>
  )
}
