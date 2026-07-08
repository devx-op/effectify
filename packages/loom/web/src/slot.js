/** Create a required slot contract. */
export const required = () => ({
  _tag: "Slot",
  required: true,
})
/** Create an optional slot contract. */
export const optional = () => ({
  _tag: "Slot",
  required: false,
})
