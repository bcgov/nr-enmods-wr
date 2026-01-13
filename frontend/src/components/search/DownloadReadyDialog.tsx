import Dialog from "@mui/material/Dialog"
import DialogTitle from "@mui/material/DialogTitle"
import DialogContent from "@mui/material/DialogContent"
import DialogActions from "@mui/material/DialogActions"
import Button from "@mui/material/Button"
import Typography from "@mui/material/Typography"
import Box from "@mui/material/Box"
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline"
import apiService from "@/service/api-service"

interface DownloadReadyDialogProps {
  open: boolean
  downloadUrl: string | null
  onClose: () => void
  fileName?: string
  searchParams?: any
}

interface SearchStatistics {
  recordCount: number
  uniqueLocations: number
  minObservationDate: string | null
  maxObservationDate: string | null
}

const DownloadReadyDialog: React.FC<DownloadReadyDialogProps> = ({
  open,
  downloadUrl,
  onClose,
  fileName = "ObservationSearchResult.csv",
  searchParams,
}) => {
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return "N/A"
    try {
      const date = new Date(dateString)
      return date.toISOString().split("T")[0] // Format as YYYY-MM-DD
    } catch {
      return dateString
    }
  }

  const statistics = searchParams?.statistics
  const summaryText = statistics
    ? `Your query returned ${statistics.recordCount.toLocaleString()} observations, from ${statistics.uniqueLocations} location${statistics.uniqueLocations !== 1 ? "s" : ""}, with observations collected between ${formatDate(statistics.minObservationDate)} and ${formatDate(statistics.maxObservationDate)}`
    : "Loading summary..."

  // Handle cleanup when dialog closes without downloading
  const handleClose = async () => {
    // Extract jobId from downloadUrl
    // URL format: http://localhost:3000/api/v1/search/observationSearch/download/{jobId}
    if (downloadUrl) {
      const jobId = downloadUrl.split("/").pop()
      if (jobId) {
        try {
          await apiService
            .getAxiosInstance()
            .delete(`/v1/search/observationSearch/job/${jobId}`)
        } catch (error) {
          console.error("Error cleaning up job:", error)
        }
      }
    }
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <CheckCircleOutlineIcon color="success" sx={{ fontSize: 32 }} />
        Export Ready
      </DialogTitle>
      <DialogContent>
        <Box
          display="flex"
          flexDirection="column"
          alignItems="flex-start"
          py={2}
        >
          <Typography variant="body2" sx={{ mb: 2, fontStyle: "italic" }}>
            {summaryText}
          </Typography>
          <Button
            variant="contained"
            color="primary"
            component="a"
            href={downloadUrl ?? undefined}
            download={fileName}
            sx={{ mt: 1, alignSelf: "center", minWidth: 180 }}
            onClick={() => setTimeout(onClose, 500)}
            disabled={!downloadUrl}
          >
            Download CSV
          </Button>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="secondary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default DownloadReadyDialog
