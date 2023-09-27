import { JSONMatch } from '../../../cli'

export const updateMatchesFromSavedFile = (
  oldMatches: JSONMatch[],
  matches: JSONMatch[],
  savedFilePath: string,
) => {
  return oldMatches
    .map((match) => {
      match.references = match.references.filter(
        (reference) => reference.fileName !== savedFilePath,
      )
      const newMatch = matches.find((newMatch) => newMatch.key === match.key)
      if (newMatch) {
        match.references = [...match.references, ...newMatch.references]
      }
      return match
    })
    .filter((match) => match.references.length > 0)
}
