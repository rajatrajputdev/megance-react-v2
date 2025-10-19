// This globally disables React Router scroll restoration for internal state changes (like FAQ toggles)
export function disableScrollRestorationDuringInteraction() {
  if ("scrollRestoration" in window.history) {
    window.history.scrollRestoration = "manual";
  }
}
