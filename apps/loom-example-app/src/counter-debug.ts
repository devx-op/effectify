const counterDynamicValueSelector = '[data-counter-dynamic-value="true"]'
const counterDebugFlashDurationMs = 180
const counterDebugBoundAttribute = "data-counter-debug-bound"

const applyFlashState = (element: HTMLElement, active: boolean): void => {
  element.dataset.counterDebugFlash = active ? "active" : "idle"
  element.style.setProperty("--counter-debug-bg", active ? "rgba(250, 204, 21, 0.28)" : "transparent")
  element.style.setProperty("--counter-debug-ring", active ? "0 0 0 1px rgba(234, 179, 8, 0.85)" : "none")
  element.style.setProperty("--counter-debug-scale", active ? "scale(1.04)" : "scale(1)")
}

export const attachCounterDebugFlash = (document: Document): boolean => {
  const counterValue = document.querySelector(counterDynamicValueSelector)

  if (!(counterValue instanceof HTMLElement) || counterValue.getAttribute(counterDebugBoundAttribute) === "true") {
    return false
  }

  counterValue.setAttribute(counterDebugBoundAttribute, "true")
  applyFlashState(counterValue, false)

  let previousText = counterValue.textContent ?? ""
  let resetHandle: ReturnType<typeof setTimeout> | undefined

  const flash = (): void => {
    if (resetHandle !== undefined) {
      clearTimeout(resetHandle)
    }

    applyFlashState(counterValue, true)
    resetHandle = setTimeout(() => {
      applyFlashState(counterValue, false)
    }, counterDebugFlashDurationMs)
  }

  const observer = new MutationObserver(() => {
    const nextText = counterValue.textContent ?? ""

    if (nextText === previousText) {
      return
    }

    previousText = nextText
    flash()
  })

  observer.observe(counterValue, {
    characterData: true,
    childList: true,
    subtree: true,
  })

  return true
}
