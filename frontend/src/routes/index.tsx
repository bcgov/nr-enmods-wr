import { Routes, Route } from "react-router-dom"
import { ProtectedRoutes } from "./protected-routes"
import Roles from "../roles"
import NotFound from "@/pages/NotFound"
import Dashboard from "@/pages/Dashboard"
import BasicSearch from "@/pages/BasicSearch"
import AdvanceSearch from "@/pages/AdvanceSearch"

export default function AppRoutes() {
  return (
    <>
      <Routes>
        <Route element={<ProtectedRoutes roles={[Roles.ENMODS_ADMIN]} />}>
          <Route path="/dashboard" element={<Dashboard />} />
        </Route>

        <Route element={<ProtectedRoutes roles={[Roles.ENMODS_USER]} />}>
          <Route path="/dashboard" element={<Dashboard />} />
        </Route>

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
