import Header from "@/components/Header"
// import Footer from '@/components/Footer'
import AppRoutes from "@/routes"
import { BrowserRouter } from "react-router-dom"
import Sidebar from "./components/Sidebar"
import "./index.css"
import { useEffect, useState } from "react"
import { API_VERSION } from "@/util/utility"
import { Footer } from "@bcgov/design-system-react-components"
import apiService from "./service/api-service"

export default function App() {
  const [openNav, setOpenNav] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState(null)

  useEffect(() => {
    // Fetch last sync time from the server
    const fetchLastSyncTime = async () => {
      try {
        const response = await apiService.getAxiosInstance().get(`${API_VERSION}/s3-sync-log/last-sync-time`);
        setLastSyncTime(response.data);
      } catch (error) {
        console.error("Error fetching last sync time:", error);
      }
    }
    fetchLastSyncTime();
  }, [])


  const handleClickNavMenu = () => {
    setOpenNav(!openNav)
  }
  // Format sync time for Pacific Time
  const formattedSyncTime = lastSyncTime
    ? new Date(lastSyncTime).toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })
    : '';

  return (
    <BrowserRouter>
      <div className="flex flex-col min-h-screen max-w-[1240px] m-auto">
        <div className="h-[40px]">
          <Header setOpenNav={setOpenNav} openNav={openNav} />
        </div>

        {openNav && (
          <div className="w-screen h-screen mt-[3em]">
            <Sidebar handleClickNavMenu={handleClickNavMenu} sidebarMessage={`Last Synced: ${formattedSyncTime} (PST)`} />
          </div>
        )}

        <div className="flex justify-start items-start min-h-screen  w-[100%]  ">
          <div className="w-[20%] mt-[4em] min-h-screen hidden md:block ">
            <Sidebar handleClickNavMenu={handleClickNavMenu} sidebarMessage={`Last Synced: ${formattedSyncTime} (PST)`} />
          </div>

          <div className="w-full md:w-[80%] min-h-screen mt-[4em] p-2 border border-gray-300 border-r-2">
            <AppRoutes />
          </div>
        </div>
      </div>
      <Footer />
    </BrowserRouter>
  )
}
