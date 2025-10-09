import { Divider, List, ListItemButton, ListItemText } from "@mui/material";
import SyncIcon from '@mui/icons-material/Sync';
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
              {/* Show the sidebarMessage only under the Search option */}
              {item.name === "Search" && sidebarMessage && (
                <>
                  <Divider sx={{ my: 1 }} />
                  <div style={{ display: 'flex', alignItems: 'center', marginTop: 8, marginBottom: 8, fontWeight: 'bold', color: '#1976d2' }}>
                    <SyncIcon sx={{ mr: 1 }} />
                    <span style={{ fontSize: '0.82em' }}>{sidebarMessage}</span>
                  </div>
                </>
              )}
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
              {/* Show the sidebarMessage only under the Search option */}
              {item.name === "Search" && sidebarMessage && (
                <div style={{ display: 'flex', alignItems: 'center', marginTop: 8, marginBottom: 8, fontWeight: 'bold', color: '#1976d2' }}>
                  <SyncIcon sx={{ mr: 1 }} />
                  <span>{sidebarMessage}</span>
                </div>
              )}
            </div>
          ))}
        </List>
      </div>
    </>
  )
}

export default sidebar
