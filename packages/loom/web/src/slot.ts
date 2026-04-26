/** Public slot definition for vNext component composition. */
export interface RequiredDefinition {
  readonly _tag: "Slot"
  readonly required: true
}

export interface OptionalDefinition {
  readonly _tag: "Slot"
  readonly required: false
}

export type Definition = RequiredDefinition | OptionalDefinition

/** Create a required slot contract. */
export const required = (): RequiredDefinition => ({
  _tag: "Slot",
  required: true,
})

/** Create an optional slot contract. */
export const optional = (): OptionalDefinition => ({
  _tag: "Slot",
  required: false,
})
