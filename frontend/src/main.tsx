/**
 * Application Entry Point
 *
 * Sets up the Redux store provider and theme provider for the entire application.
 * This ensures all components have access to the Redux store and Material-UI theme.
 */

import ReactDOM from "react-dom/client"
import { ThemeProvider, CssBaseline } from "@mui/material"
import { Provider } from "react-redux"
import theme from "./theme"
import App from "./App"
import { store } from "./store"

/**
 * Main component that wraps the application with necessary providers.
 *
 * Provider Stack (from outside to inside):
 * 1. Redux Provider - makes store available to all components
 * 2. Material-UI ThemeProvider - provides theme configuration
 * 3. CssBaseline - applies Material-UI CSS normalization
 * 4. App - main application component
 */
const Main = () => {
  return (
    // Redux Provider - makes Redux store available to all child components
    <Provider store={store}>
      {/* Material-UI Theme Provider - applies consistent styling throughout app */}
      <ThemeProvider theme={theme}>
        {/* CssBaseline - normalizes CSS across browsers */}
        <CssBaseline />
        {/* Main application component and routes */}
        <App />
      </ThemeProvider>
    </Provider>
  )
}

// Render the application to the DOM
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <Main />,
)
