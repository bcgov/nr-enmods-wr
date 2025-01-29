import { Routes, Route } from "react-router"
import { ProtectedRoutes } from "./protected-routes"
import Roles from "../roles"
import NotFound from "@/pages/NotFound"
import Dashboard from "@/pages/Dashboard"
import AdminPage from "@/pages/AdminPage"
import BasicSearch from "@/pages/BasicSearch"
import AdvanceSearch from "@/pages/AdvanceSearch"
import Search from "@/pages/Search"

export default function AppRoutes() {
  return (
    <>
      <Routes>
        <Route element={<ProtectedRoutes roles={[Roles.ENMODS_ADMIN]} />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin" element={<AdminPage />} />
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
