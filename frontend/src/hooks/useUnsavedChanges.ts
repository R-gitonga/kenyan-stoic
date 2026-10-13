import { useEffect } from "react"

export function useUnsavedChanges(dirty: boolean) {
  useEffect(() => {
    const warnOnUnload = (event: BeforeUnloadEvent) => {
      if (dirty) { event.preventDefault(); event.returnValue = "" }
    }
    const warnOnLink = (event: MouseEvent) => {
      if (!dirty || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
      const anchor = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null
      if (!anchor || anchor.hasAttribute("download") || (anchor.target && anchor.target !== "_self")) return
      const destination = new URL(anchor.href, window.location.href)
      if (destination.origin !== window.location.origin || (destination.pathname === window.location.pathname && destination.search === window.location.search)) return
      if (!window.confirm("Leave without saving your changes? Unsaved writing will be lost.")) {
        event.preventDefault(); event.stopPropagation()
      }
    }
    window.addEventListener("beforeunload", warnOnUnload)
    document.addEventListener("click", warnOnLink, true)
    return () => { window.removeEventListener("beforeunload", warnOnUnload); document.removeEventListener("click", warnOnLink, true) }
  }, [dirty])
}
