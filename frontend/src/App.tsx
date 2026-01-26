import Header from "@/components/Header"
// import Footer from '@/components/Footer'
import AppRoutes from "@/routes"
import { BrowserRouter } from "react-router-dom"
import Sidebar from "./components/Sidebar"
import "./index.css"
import { useEffect, useState } from "react"
import { Footer } from "@bcgov/design-system-react-components"
import { useDispatch, useSelector } from "react-redux"
import { fetchAllDropdowns } from "./store/dropdownSlice"
import { fetchLastSyncTime } from "./store/syncInfoSlice"
import RequestLoadingIndicator from "@/components/RequestLoadingIndicator"
import type { RootState } from "@/store"

export default function App() {
  const dispatch = useDispatch()

  const [openNav, setOpenNav] = useState(false)
  const lastSyncTime = useSelector(
    (state: RootState) => state.syncInfo.lastSyncTime,
  )

  useEffect(() => {
    // Initialize dropdown data on app mount
    // This fetches all 15 dropdown types once and caches them in Redux
    // Components throughout the app use useDropdowns() to access this cached data
    dispatch(fetchAllDropdowns() as any)
    // Fetch last sync time and cache it in Redux
    dispatch(fetchLastSyncTime() as any)
  }, [dispatch])

  const handleClickNavMenu = () => {
    setOpenNav(!openNav)
  }
  // Format sync time for Pacific Time
  const formattedSyncTime = lastSyncTime
    ? new Date(lastSyncTime).toLocaleString("en-US", {
        timeZone: "America/Los_Angeles",
      })
    : ""

  return (
    <BrowserRouter>
      <RequestLoadingIndicator position="overlay" />
      <div className="flex flex-col min-h-screen max-w-[1240px] m-auto">
        <div className="h-[40px]">
          <Header setOpenNav={setOpenNav} openNav={openNav} />
        </div>

        {openNav && (
          <div className="w-screen h-screen mt-[3em]">
            <Sidebar
              handleClickNavMenu={handleClickNavMenu}
              sidebarMessage={`Last Synced: ${formattedSyncTime} (PST)`}
            />
          </div>
        )}

        <div className="flex justify-start items-start min-h-screen  w-[100%]  ">
          <div className="w-[20%] mt-[4em] min-h-screen hidden md:block ">
            <Sidebar
              handleClickNavMenu={handleClickNavMenu}
              sidebarMessage={`Last Synced: ${formattedSyncTime} (PST)`}
            />
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
