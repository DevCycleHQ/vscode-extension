import { Feature, Variable } from '../../cli'

export const sortByName = (
  map: Record<string, Variable> | Record<string, Feature>,
) =>
  Object.values(map).sort((a, b) =>
    (a.name || a.key).localeCompare(b.name || b.key),
  )
