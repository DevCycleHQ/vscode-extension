import { JSONMatch } from '../../../cli'
import { updateMatchesFromSavedFile } from './utils'
import { describe, it } from 'mocha'
import { expect } from 'chai'

describe('Usages Utils Tests', () => {
  describe('updateMatchesFromSavedFile', () => {
    const oldMatches: JSONMatch[] = [
      {
        key: 'key1',
        references: [
          {
            codeSnippet: {
              lineNumbers: { start: 110, end: 110 },
              content: 'useVariableValue(key1, false)',
            },
            lineNumbers: { start: 110, end: 110 },
            fileName: 'src/filename.ts',
            language: 'typescript',
          },
          {
            codeSnippet: {
              lineNumbers: { start: 10, end: 10 },
              content: 'useVariableValue(key1, false)',
            },
            lineNumbers: { start: 10, end: 10 },
            fileName: 'src/otherfilename.ts',
            language: 'typescript',
          },
        ],
      },
      {
        key: 'key2',
        references: [
          {
            codeSnippet: {
              lineNumbers: { start: 111, end: 111 },
              content: 'useVariableValue(key2, false)',
            },
            lineNumbers: { start: 111, end: 111 },
            fileName: 'src/filename.ts',
            language: 'typescript',
          },
          {
            codeSnippet: {
              lineNumbers: { start: 11, end: 11 },
              content: 'useVariableValue(key2, false)',
            },
            lineNumbers: { start: 11, end: 11 },
            fileName: 'src/otherfilename.ts',
            language: 'typescript',
          },
        ],
      },
    ]

    it('should remove matches for the saved file if no matches were found', () => {
      const matches: JSONMatch[] = []
      const savedFilePath = 'src/filename.ts'
      const updatedMatches = updateMatchesFromSavedFile(
        oldMatches,
        matches,
        savedFilePath,
      )
      expect(updatedMatches).to.not.equal(oldMatches)
      expect(
        updatedMatches.find((match) => {
          const references = match.references
          return references.find(
            (reference) => reference.fileName === savedFilePath,
          )
        }),
      ).to.be.undefined
    })

    it('should update matches for the saved file if matches were found', () => {
      const matches: JSONMatch[] = [
        {
          key: 'key1',
          references: [
            {
              codeSnippet: {
                lineNumbers: { start: 115, end: 115 },
                content: 'useVariableValue(key1, false)',
              },
              lineNumbers: { start: 115, end: 115 },
              fileName: 'src/filename.ts',
              language: 'typescript',
            },
          ],
        },
      ]
      const savedFilePath = 'src/filename.ts'
      const updatedMatches = updateMatchesFromSavedFile(
        oldMatches,
        matches,
        savedFilePath,
      )

      expect(updatedMatches[0].references.length).to.equal(2)
      expect(
        updatedMatches[0].references.find(
          (match) => match.fileName === savedFilePath,
        )?.lineNumbers.start,
      ).to.equal(115)
      expect(updatedMatches[1].references.length).to.equal(1)
      expect(updatedMatches[1].references[0].fileName).not.to.equal(
        savedFilePath,
      )
    })
  })
})
