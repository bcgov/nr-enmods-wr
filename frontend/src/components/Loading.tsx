import { Backdrop, CircularProgress, Typography } from "@mui/material"

export default function Loading(props: any) {
  const { isLoading } = props

  return (
    <Backdrop
      sx={{
        color: "#fff",
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
      <CircularProgress color="inherit" size={60} />
      <Typography
        variant="subtitle1"
        sx={{ fontSize: "1.2rem", maxWidth: 600 }}
      >
        Please wait while your data is being processed. This may take several
        minutes.
        <br />
        <strong>Please do not refresh your screen.</strong>
      </Typography>
    </Backdrop>
  )
}
