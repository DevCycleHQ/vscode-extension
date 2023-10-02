import { JSONMatch } from '../../../cli'
import partition from 'lodash.partition'

export const updateMatchesFromSavedFile = (
  oldMatches: JSONMatch[],
  matches: JSONMatch[],
  savedFilePath: string,
) => {
  const oldMatchesMap = convertMatchesToMap(oldMatches)
  const [existingNewMatches, newMatches] = partition(
    matches,
    (match) => oldMatchesMap[match.key],
  )
  const existingNewMatchesMap = convertMatchesToMap(existingNewMatches)
  return oldMatches
    .map((match) => {
      match.references = match.references.filter(
        (reference) => reference.fileName !== savedFilePath,
      )
      const existingMatch = existingNewMatchesMap[match.key]
      if (existingMatch) {
        match.references = [...match.references, ...existingMatch.references]
      }
      return match
    })
    .filter((match) => match.references.length > 0)
    .concat(newMatches)
}

const convertMatchesToMap = (matches: JSONMatch[]) => {
  return matches.reduce(
    (map, match) => {
      map[match.key] = match
      return map
    },
    {} as Record<string, JSONMatch>,
  )
}
