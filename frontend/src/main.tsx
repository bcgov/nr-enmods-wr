import { useEffect, useState } from "react"
import ReactDOM from "react-dom/client"
import { ThemeProvider, CssBaseline } from "@mui/material"
import theme from "./theme"
import App from "./App"
import UserService from "./service/user-service"

const Main = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const currentRoute = window.location.pathname

  useEffect(() => {
    UserService.initKeycloak(currentRoute, (authenticated) => {
      setIsAuthenticated(authenticated)
    })
  }, [currentRoute])

  if (isAuthenticated === null) {
    return <div>Loading...</div>
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  )
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <Main />,
)
