import { Backdrop, CircularProgress } from "@mui/material"

export default function Loading(props: any) {
  const { isLoading } = props
  return (
    <Backdrop
      sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }}
      open={isLoading}
    >
      <CircularProgress color="inherit" />
    </Backdrop>
  )
}
