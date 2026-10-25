// Shared by the server layout (inline script) and the client theme store — no "use client" here.
export const THEME_STORAGE_KEY = "pp-theme";

/**
 * Inline script for <head>: resolves the stored preference before first paint so there is
 * no flash of the wrong theme. Mirrors `applyTheme` below.
 */
export const themeInitScript = `(function(){try{var p=null;try{p=localStorage.getItem("${THEME_STORAGE_KEY}")}catch(e){}if(p!=="light"&&p!=="dark")p="system";var d=p==="dark"||(p==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;r.setAttribute("data-theme-pref",p);r.setAttribute("data-theme",d?"dark":"light");}catch(e){}})();`;
