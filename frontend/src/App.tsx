import Header from "@/components/Header"
// import Footer from '@/components/Footer'
import AppRoutes from "@/routes"
import { BrowserRouter } from "react-router-dom"
import Sidebar from "./components/Sidebar"
import "./index.css"
import { useState } from "react"
import { Footer } from "@bcgov/design-system-react-components"

export default function App() {
  const [openNav, setOpenNav] = useState(false)

  const handleClickNavMenu = () => {
    setOpenNav(!openNav)
  }
  return (
    <BrowserRouter>
      <div className="flex flex-col min-h-screen max-w-[1240px] m-auto">
        <div className="h-[40px]">
          <Header setOpenNav={setOpenNav} openNav={openNav} />
        </div>

        {openNav && (
          <div className="w-screen h-screen mt-[3em]">
            <Sidebar handleClickNavMenu={handleClickNavMenu} />
          </div>
        )}

        <div className="flex justify-start items-start min-h-screen  w-[100%]  ">
          <div className="w-[20%] mt-[4em] min-h-screen hidden md:block ">
            <Sidebar handleClickNavMenu={handleClickNavMenu} />
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
