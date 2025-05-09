import ReactDOM from "react-dom/client"
import { ThemeProvider, CssBaseline } from "@mui/material"
import theme from "./theme"
import App from "./App"

const Main = () => {
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
