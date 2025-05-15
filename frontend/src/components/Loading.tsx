import { Backdrop, CircularProgress } from "@mui/material"
import TitleText from "./TitleText"
import { color, fontSize } from "~/@mui/system"

export default function Loading(props: any) {
  const { isLoading } = props
  return (
    <Backdrop
      sx={{
        color: "#fff",
        zIndex: (theme) => theme.zIndex.drawer + 1,
        display: "flex",
        gap: 1,
      }}
      open={isLoading}
    >
      <CircularProgress color="inherit" />
      <TitleText
        variant={"subtitle1"}
        text="Please wait while your data is being processed, this may take several minutes.  Please do not refresh your screen."
        sx={{ fontSize: "1.2rem" }}
      />
    </Backdrop>
  )
}
