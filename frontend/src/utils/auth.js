export function getRole() {
  return localStorage.getItem("role");
}

export function isAuthenticated() {
  return Boolean(localStorage.getItem("access_token"));
}

export function logout() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("role");
  localStorage.removeItem("full_name");
  window.location.href = "/login";
}
