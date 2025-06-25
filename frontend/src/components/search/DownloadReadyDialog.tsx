import Dialog from "@mui/material/Dialog"
import DialogTitle from "@mui/material/DialogTitle"
import DialogContent from "@mui/material/DialogContent"
import DialogActions from "@mui/material/DialogActions"
import Button from "@mui/material/Button"
import Typography from "@mui/material/Typography"
import Box from "@mui/material/Box"
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline"

interface DownloadReadyDialogProps {
  open: boolean
  downloadUrl: string | null
  onClose: () => void
  fileName?: string
}

const DownloadReadyDialog: React.FC<DownloadReadyDialogProps> = ({
  open,
  downloadUrl,
  onClose,
  fileName = "ObservationSearchResult.csv",
}) => (
  <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
    <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <CheckCircleOutlineIcon color="success" sx={{ fontSize: 32 }} />
      Export Ready
    </DialogTitle>
    <DialogContent>
      <Box display="flex" flexDirection="column" alignItems="center" py={2}>
        <Typography variant="body1" gutterBottom>
          Your file is ready for download.
        </Typography>
        <Button
          variant="contained"
          color="primary"
          component="a"
          href={downloadUrl ?? undefined}
          download={fileName}
          sx={{ mt: 2, minWidth: 180 }}
          onClick={() => setTimeout(onClose, 500)}
          disabled={!downloadUrl}
        >
          Download CSV
        </Button>
      </Box>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose} color="secondary">
        Close
      </Button>
    </DialogActions>
  </Dialog>
)

export default DownloadReadyDialog
