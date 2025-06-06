import { Backdrop, CircularProgress } from "@mui/material"

export default function LoadingSpinner(props: { isLoading: boolean }) {
  const { isLoading } = props
  return (
    <Backdrop
      sx={{
        color: "#fff",
        backgroundColor: "rgba(0, 0, 0, 0.2)",
        zIndex: (theme) => theme.zIndex.drawer + 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
        padding: 4,
        textAlign: "center",
      }}
      open={isLoading}
    >
      <CircularProgress color="inherit" size={50} />
    </Backdrop>
  )
}
