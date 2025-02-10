import { useState, type FC } from "react"
import { Close, TableRows } from "@mui/icons-material"

const Navbar: FC = ({ setOpenNav, openNav }) => {
  return (
    <>
      <div className={"text-gray-700 sm:hidden"}>
        {!openNav && (
          <TableRows
            onClick={() => setOpenNav(!openNav)}
            sx={{ color: "#38598a" }}
          />
        )}
        {openNav && (
          <Close
            onClick={() => setOpenNav(!openNav)}
            sx={{ color: "#38598a" }}
          />
        )}
      </div>
    </>
  )
}

export default Navbar
