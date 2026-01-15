import { Routes, Route } from "react-router-dom"
import NotFound from "@/pages/NotFound"
import BasicSearch from "@/pages/BasicSearch"
import AdvanceSearch from "@/pages/AdvanceSearch"

export default function AppRoutes() {
  return (
    <>
      <Routes>
        <Route path="/" element={<BasicSearch />} />
        <Route path="*" element={<NotFound />} />
        <Route path="search">
          <Route index element={<BasicSearch />} />
          <Route path="basic" element={<BasicSearch />} />
          <Route path="advance" element={<AdvanceSearch />} />
        </Route>
      </Routes>
    </>
  )
}
