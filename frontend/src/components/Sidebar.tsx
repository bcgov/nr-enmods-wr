import { Divider, List, ListItemButton, ListItemText } from "@mui/material"
import { NavLink } from "react-router-dom"
import { Home, Search } from "@mui/icons-material"

const items = [
  { name: "Home", link: "/home", icon: <Home /> },
  { name: "Search", link: "/search", icon: <Search /> },
]

const sidebar = ({ handleClickNavMenu }) => {
  return (
    <>
      <div className={"hidden md:block "}>
        <List>
          {items.map((items, index) => (
            <div key={index}>
            <ListItemButton  component={NavLink} to={items.link} sx={{display: "flex", gap: ".5rem"}}>              
                <span>{items.icon}</span> <ListItemText primary={items.name} />            
            </ListItemButton>
            <Divider/>
            </div>
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
              {items.icon} <ListItemText primary={items.name} />
            </ListItemButton>
          ))}
        </List>
      </div>
    </>
  )
}

export default sidebar
