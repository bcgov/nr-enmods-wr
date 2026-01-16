import BCGovLogo from "@/assets/gov-bc-logo-horiz.png"
import { AppBar, Toolbar, Box } from "@mui/material"
import config from "../config"
// import Typography from '@mui/material/Typography'
import Navbar from "./Navbar"

const styles = {
  toolbar: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  innerContent: {
    maxWidth: "1800px",
    width: "100%",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
  },
  footerButton: {
    margin: "0.2em",
    padding: "0.2em",
    color: "#ffffff",
    backgroundColor: "#ffffff",
  },
  separator: {
    height: "2px",
    backgroundColor: "#fcba19",
    width: "100%",
  },
  navToolbar: {
    minHeight: "40px !important",
    justifyContent: "space-between",
    width: "100%",
    maxHeight: "40px",
    backgroundColor: "#38598a",
    borderBottom: "px solid rgba(0, 0, 0, 0.1)",
  },
}
export default function Header() {
  // Set header color based on environment
  let headerBgColor = "#003366";
  const env = config.ENVIRONMENT;
  if (env === "PROD") {
    headerBgColor = "#003366";
  } else if (env === "TEST") {
    headerBgColor = "#b76f1c"; // orange for test
  } else if (env === "DEV") {
    headerBgColor = "#069218"; // green for dev
  } else if (env === "LOCAL") {
    headerBgColor = "#3700ff"; // purple for local
  }
  return (
    <>
      {env === "TEST" && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            zIndex: 9999,
            pointerEvents: "none",
            userSelect: "none",
            opacity: 0.12,
            overflow: "hidden",
          }}
        >
          {[...Array(6)].map((_, row) => (
            <div
              key={row}
              style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "space-between",
                width: "100vw",
                marginTop: `${row * 14}vh`,
                transform: `rotate(-20deg)`,
              }}
            >
              {[...Array(5)].map((_, col) => (
                <span
                  key={col}
                  style={{
                    fontSize: "8vw",
                    color: "#b71c1c",
                    fontWeight: 900,
                    marginLeft: `${col * 2}vw`,
                    marginRight: `${col * 2}vw`,
                    textTransform: "uppercase",
                  }}
                >
                  UAT
                </span>
              ))}
            </div>
          ))}
        </div>
      )}
      <AppBar position="fixed" elevation={0} className="nav-header">
        <Box sx={{ bgcolor: headerBgColor }}>
          <Toolbar sx={{ maxHeight: "10px" }}>
            <img
              style={{ maxHeight: "60px", paddingLeft: "20%" }}
              alt="Logo"
              src={BCGovLogo}
            />
            <h1 style={{ paddingLeft: "2%" }}>ENMODS Web Reporting</h1>
            <h4 style={{ paddingLeft: "50%", fontSize: "0.85rem", fontWeight: 400 }}>{env} Environment</h4>
          </Toolbar>
        </Box>
        <Box sx={styles.separator} />
        <Box sx={{ bgcolor: headerBgColor }}>
          <Toolbar sx={styles.navToolbar}>
            {env !== "PROD" && (
              <a
                href={config.PROD_LINK}
                style={{
                  fontSize: "0.85rem",
                  paddingLeft: "90%",
                  color: "#ffffff",
                  textDecoration: "underline",
                  cursor: "pointer",
                  fontWeight: 500,
                  transition: "color 0.2s",
                }}
                onMouseOver={e => (e.currentTarget.style.color = "#fcba19")}
                onMouseOut={e => (e.currentTarget.style.color = "#ffffff")}
              >
                Click for production
              </a>
            )}
            <Navbar />
          </Toolbar>
        </Box>
      </AppBar>
    </>
  )
}
