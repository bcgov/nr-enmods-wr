import Box from "@mui/material/Box"
import Header from "@/components/Header"
// import Footer from '@/components/Footer'
import AppRoutes from "@/routes"
import { BrowserRouter } from "react-router-dom"
import Sidebar from "./components/Sidebar"
import "./index.css"
import { useState } from "react"

// const styles = {
//   container: {
//     display: "flex",
//     flexDirection: "column",
//     minHeight: "100vh",
//   },
//   contentWrapper: {
//     display: "flex",
//     justifyContent: "center",
//     alignItems: "flex-start",
//     // bgcolor: '#efefff',
//     width: "100%",
//   },
//   content: {
//     display: "flex",
//     width: "1200px",
//     bgcolor: "#ffffff",
//   },
//   sidebar: {
//     paddingTop: "8em",
//     paddingLeft: "2em",
//     // width: '28%',
//     width: "20%",
//     // bgcolor: '#efefff',
//   },
//   mainContent: {
//     marginTop: "8em",
//     width: "70%",
//   },
//   separator: {
//     width: "1px",
//     bgcolor: "rgb(217, 217, 217)",
//     minHeight: "100vh",
//   },
// }

export default function App() {
  const [openNav, setOpenNav] = useState(false)

  const handleClickNavMenu = () => {
    setOpenNav(!openNav)
  }
  return (
    <BrowserRouter>
      {/* <div className="flex flex-col min-h-screen">
        <Header />
        <div className="flex justify-center items-start w-[100%]">
          <div className="flex w-[1240px] ">
            <div className="w-[20%] mt-[8em] hidden md:block">
              <Sidebar />
            </div>
            <div className="w-[1px] border-grar-200 border min-h-screen"></div>
            <div className="mt-[8em] w-[80%]">
              <AppRoutes />
            </div>
          </div>
        </div>
      </div> */}

      <div className="flex flex-col min-h-screen max-w-[1240px] m-auto">
        <div className="h-[40px]">
          <Header setOpenNav={setOpenNav} openNav={openNav} />
        </div>

        {openNav && (
          <div className="w-screen h-screen mt-[3em]">
            <Sidebar handleClickNavMenu={handleClickNavMenu} />
          </div>
        )}

        <div className="flex mt-16 justify-center items-start w-[100%]">
          <div className="w-[20%] border border-l-2 h-screen hidden md:block">
            <Sidebar handleClickNavMenu={handleClickNavMenu} />
          </div>

          <div className=" md:w-[80%]  p-2">
            <AppRoutes />
          </div>
        </div>
      </div>

      {/* <Box sx={styles.container}>
      <Header />
        <Box sx={styles.contentWrapper}>
          <Box sx={styles.content}>
            <Box sx={styles.sidebar}>
              <Sidebar />
            </Box>
            <Box sx={styles.separator} />
            <Box sx={styles.mainContent}>
              <AppRoutes />
            </Box>
          </Box>
        </Box>    
      </Box> */}
    </BrowserRouter>
  )
}
