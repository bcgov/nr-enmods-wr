import { Divider, List, ListItemButton, ListItemText } from "@mui/material";
import { NavLink } from "react-router-dom";
import { Home, Search } from "@mui/icons-material";

const items = [
  { name: "Home", link: "/home", icon: <Home /> },
  { name: "Search", link: "/search", icon: <Search /> },
]

const sidebar = ({ handleClickNavMenu, sidebarMessage }) => {
  return (
    <>
      <div className={"hidden md:block "}>
        <List>
          {items.map((item, index) => (
            <div key={index}>
              <ListItemButton component={NavLink} to={item.link} sx={{display: "flex", gap: ".5rem"}}>
                <span>{item.icon}</span> <ListItemText primary={item.name} />
              </ListItemButton>
              <Divider/>
            </div>
          ))}
        </List>
      </div>
      <div className="md:hidden">
        <List>
          {items.map((item, index) => (
            <div key={index}>
              <ListItemButton
                component={NavLink}
                to={item.link}
                onClick={handleClickNavMenu}
              >
                {item.icon} <ListItemText primary={item.name} />
              </ListItemButton>
            </div>
          ))}
        </List>
      </div>
    </>
  )
}

export default sidebar
