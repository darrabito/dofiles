export default function getCurrentInputElement(e) {
  return e && e.path && e.path.length && e.path[0] !== e.currentTarget
    ? e.path[0]
    : e.currentTarget && e.currentTarget.activeElement
    ? e.currentTarget.activeElement
    : e.explicitOriginalTarget
    ? e.explicitOriginalTarget
    : e.currentTarget;
}
