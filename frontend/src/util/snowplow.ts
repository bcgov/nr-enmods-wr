
import config from "../config";

export function setUpSnowplow() {
  // Async loader pattern (same as snowplow-init.js)
  (function (p, l, o, w, i, n, g) {
    if (!p[i]) {
      p.GlobalSnowplowNamespace = p.GlobalSnowplowNamespace || [];
      p.GlobalSnowplowNamespace.push(i);
      p[i] = function () {
        (p[i].q = p[i].q || []).push(arguments);
      };
      p[i].q = p[i].q || [];
      n = l.createElement(o);
      g = l.getElementsByTagName(o)[0];
      n.async = 1;
      n.src = w;
      g.parentNode.insertBefore(n, g);
    }
  })(
    window,
    document,
    "script",
    "https://www2.gov.bc.ca/StaticWebResources/static/sp/sp-2-14-0.js",
    "snowplow"
  );

  // Initialize tracker after script loads
  window.addEventListener("load", function () {
    // Use config or env to set collector domain
    const collector =
      config.ENVIRONMENT === "PROD"
        ? "spt.apps.gov.bc.ca"
        : "spm.apps.gov.bc.ca";
    if (window.snowplow) {
      window.snowplow("newTracker", "rt", collector, {
        appId: "Snowplow_standalone_ENV",
        cookieLifetime: 86400 * 548,
        platform: "web",
        post: true,
        forceSecureTracker: true,
        contexts: {
          webPage: true,
          performanceTiming: true,
        },
      });
      window.snowplow("enableActivityTracking", 30, 30);
      window.snowplow("enableLinkClickTracking");
      window.snowplow("trackPageView");
    }
  });
}
