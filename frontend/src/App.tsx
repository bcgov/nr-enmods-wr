import Box from '@mui/material/Box'
import Header from '@/components/Header'
import AppRoutes from '@/routes'
import { BrowserRouter } from 'react-router-dom'
import { Footer } from "@bcgov/design-system-react-components";
import { IconButton } from '~/@mui/material'
import { HomeRounded } from '~/@mui/icons-material'

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
  },
  content: {
    flexGrow: 1,
    marginTop: '5em',
    marginRight: '1em',
    marginLeft: '1em',
    marginBottom: '5em',
    height: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  separator: {
    width: '1px',
    marginLeft: "-5%",
    bgcolor: 'rgb(217, 217, 217)',
    minHeight: '100%',
  },
}

export default function App() {
  return (
     <BrowserRouter>
      <Box sx={styles.container}>
        <Header />
         <Box sx={styles.content}>
           <Box sx={styles.separator} />
           <Box sx={styles.content}>
             <AppRoutes />
           </Box>
         </Box>
        <Footer />
      </Box>
    </BrowserRouter>
  )
}
