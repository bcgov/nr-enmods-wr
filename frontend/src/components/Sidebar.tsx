/* eslint-disable prettier/prettier */
import React from "react";
import { List, ListItemButton, ListItemText } from "@mui/material";
import { NavLink } from "react-router-dom";

const items = [
  { name: "BC Home", link: "/" },
  { name: "Ministry of Environment", link: "/" },
  { name: "WR", link: "/wr" },
  { name: "Dashboard", link: "/dashboard" },
  { name: "EMS", link: "/ems" },
  { name: "Admin", link: "/admin" },
  { name: "Search", link: "/search"}
];
const link_g = "www.google.com";
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
  );
};

export default sidebar;
