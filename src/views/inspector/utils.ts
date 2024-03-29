import { Feature, Variable } from '../../cli'

export const sortByName = (
  map: Record<string, Variable> | Record<string, Feature>,
) => Object.values(map).sort((a, b) => a.name.localeCompare(b.name))

export const sortByKey = (
  map: Record<string, Variable> | Record<string, Feature>,
) => Object.values(map).sort((a, b) => a.key.localeCompare(b.key))
