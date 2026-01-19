// environment variable handling in production build images
// require runtime placement of vars to prevent rebuilding the image
// this application is destined to be run via a caddy file server.
// caddy file server has the https://caddyserver.com/docs/caddyfile/directives/templates
// templates directive to easily handle runtime variables

const config = {
  API_BASE_URL:
    window.VITE_APP_API_URL || import.meta.env.VITE_APP_API_URL || window.REACT_APP_API_URL || "/api",
  ENVIRONMENT:
    window.VITE_ENVIRONMENT || import.meta.env.VITE_ENVIRONMENT || window.REACT_APP_ENVIRONMENT || "DEV",
  PROD_LINK:
    window.VITE_PROD_LINK || import.meta.env.VITE_PROD_LINK || window.REACT_APP_PROD_LINK
}

export default config
