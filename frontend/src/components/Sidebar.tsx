import { List, ListItemButton, ListItemText } from "@mui/material"
import { NavLink } from "react-router-dom"

const items = [
  { name: "BC Home", link: "/" },
  { name: "Search", link: "/search" },
]

const sidebar = () => {
  return (
    <div>
      <List>
        {items.map((items, index) => (
          <ListItemButton key={index} component={NavLink} to={items.link}>
            <ListItemText primary={items.name} />
          </ListItemButton>
        ))}
      </List>
    </div>
  )
}

export default sidebar
