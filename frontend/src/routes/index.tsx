import { Routes, Route } from "react-router-dom"
import NotFound from "@/pages/NotFound"
import BasicSearch from "@/pages/BasicSearch"
import AdvanceSearch from "@/pages/AdvanceSearch"
import Home from "@/pages/Home"

export default function AppRoutes() {
  return (
    <>
      <Routes>
        <Route path="*" element={<NotFound />} />
        <Route path="home">
          <Route index element={<Home />} />
        </Route>
        <Route path="search">
          <Route index element={<BasicSearch />} />
          <Route path="basic" element={<BasicSearch />} />
          <Route path="advance" element={<AdvanceSearch />} />
        </Route>
      </Routes>
    </>
  )
}
