// environment variable handling in production build images
// require runtime placement of vars to prevent rebuilding the image
// this application is destined to be run via a caddy file server.
// caddy file server has the https://caddyserver.com/docs/caddyfile/directives/templates
// templates directive to easily handle runtime variables

const config = {
  API_BASE_URL:
    window.VITE_APP_API_URL || import.meta.env.VITE_APP_API_URL || "/api",
}

export default config
