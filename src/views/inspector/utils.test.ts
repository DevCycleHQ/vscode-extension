import { describe, it } from 'mocha'
import sinon from 'sinon'
import { Feature, Variable } from '../../cli'
import { sortByKey, sortByName } from './utils'

describe('Inspector Utils', () => {
  describe('sortByName', () => {
    const variables: Record<string, Variable> = {
      var1: {
        key: 'var1',
        name: 'var1',
        type: 'String',
        _id: 'id1',
        _feature: 'feature1',
        status: 'archived',
        createdAt: '',
        updatedAt: '',
      },
      var2: {
        key: 'var2',
        name: 'var2',
        type: 'String',
        _id: 'id2',
        _feature: 'feature2',
        status: 'active',
        createdAt: '',
        updatedAt: '',
      },
      // @ts-ignore
      var3: {
        key: 'var3',
        type: 'String',
        _id: 'id3',
        _feature: 'feature3',
        status: 'archived',
        createdAt: '',
        updatedAt: '',
      },
    }

    const features: Record<string, Feature> = {
      feature1: {
        key: 'feat1',
        name: 'feat1',
        _id: 'id1',
        variations: [],
        variables: [],
      },
      feature2: {
        key: 'feat2',
        name: 'feat2',
        _id: 'id1',
        variations: [],
        variables: [],
      },
      // @ts-ignore
      feature3: {
        key: 'feat3',
        _id: 'id1',
        name: 'feat3',
        variations: [],
        variables: [],
      },
    }
    it('should sort by name', async () => {
      const orderedFeatures = sortByName(features)

      // assert its in alphabetical order
      sinon.assert.match(orderedFeatures[0].name, 'feat1')
      sinon.assert.match(orderedFeatures[1].name, 'feat2')
      sinon.assert.match(orderedFeatures[2].name, 'feat3')
    })

    it('should sort by key', async () => {
      const orderedVariables = sortByKey(variables)

      // assert its in alphabetical order
      sinon.assert.match(orderedVariables[0].key, 'var1')
      sinon.assert.match(orderedVariables[1].key, 'var2')
      sinon.assert.match(orderedVariables[2].key, 'var3')
    })
  })
})
