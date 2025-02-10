import { List, ListItemButton, ListItemText } from "@mui/material"
import { NavLink } from "react-router-dom"

const items = [
  { name: "BC Home", link: "/" },
  { name: "Search", link: "/search" },
]

const sidebar = ({ handleClickNavMenu }) => {
  return (
    <>
      <div className={"hidden md:block "}>
        <List>
          {items.map((items, index) => (
            <ListItemButton key={index} component={NavLink} to={items.link}>
              <ListItemText primary={items.name} />
            </ListItemButton>
          ))}
        </List>
      </div>
      <div className="md:hidden">
        <List>
          {items.map((items, index) => (
            <ListItemButton
              key={index}
              component={NavLink}
              to={items.link}
              onClick={handleClickNavMenu}
            >
              <ListItemText primary={items.name} />
            </ListItemButton>
          ))}
        </List>
      </div>
    </>
  )
}

export default sidebar
