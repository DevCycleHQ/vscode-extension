import { assert, expect } from 'chai'
import { describe, it, beforeEach, afterEach, after } from 'mocha'
import sinon from 'sinon'
import { getAllFeatures, getFeature, getFeatureConfigurations } from './featuresCLIController'
import { StateManager } from '../StateManager'
import * as baseCLIController from './baseCLIController'

const mockCachedFeatures = {
  "64659286ff07741f83cece66": {
    "_id": "64659286ff07741f83cece66",
    "_project": "61730d64529341ae237de2e9",
    "source": "dashboard",
    "type": "release",
    "name": "Variable Schemas",
    "key": "variable-schemas",
    "description": "",
    "_createdBy": "google-oauth2|117615135861690764969",
    "createdAt": "2023-05-18T02:50:46.611Z",
    "updatedAt": "2023-06-09T18:52:54.539Z",
    "variations": [
      {
        "_id": "64659286ff07741f83cece6b",
        "key": "variation-on",
        "name": "Variation On",
        "variables": {
          "variable-schemas": true
        }
      },
      {
        "_id": "64659286ff07741f83cece6c",
        "key": "variation-off",
        "name": "Variation Off",
        "variables": {
          "variable-schemas": false
        }
      }
    ],
    "controlVariation": "variation-on",
    "variables": [
      {
        "_id": "644a9b0ef347df8289ea96d6",
        "_project": "61730d64529341ae237de2e9",
        "_feature": "64659286ff07741f83cece66",
        "name": "variable-schemas",
        "key": "variable-schemas",
        "type": "Boolean",
        "status": "active",
        "defaultValue": false,
        "source": "dashboard",
        "_createdBy": "google-oauth2|108470150099582715105",
        "createdAt": "2023-04-27T15:55:58.651Z",
        "updatedAt": "2023-05-18T02:50:46.619Z"
      }
    ],
    "tags": [],
    "readonly": false,
    "settings": {
      "optInEnabled": false,
      "publicName": "",
      "publicDescription": ""
    },
    "sdkVisibility": {
      "mobile": true,
      "client": true,
      "server": true
    }
  }
}

const mockCLIFeatures = [
  {
    "_id": "64659286ff07741f83cece66",
    "_project": "61730d64529341ae237de2e9",
    "source": "dashboard",
    "type": "release",
    "name": "Variable Schemas",
    "key": "variable-schemas",
    "description": "",
    "_createdBy": "google-oauth2|117615135861690764969",
    "createdAt": "2023-05-18T02:50:46.611Z",
    "updatedAt": "2023-06-09T18:52:54.539Z",
    "variations": [
      {
        "_id": "64659286ff07741f83cece6b",
        "key": "variation-on",
        "name": "Variation On",
        "variables": {
          "variable-schemas": true
        }
      },
      {
        "_id": "64659286ff07741f83cece6c",
        "key": "variation-off",
        "name": "Variation Off",
        "variables": {
          "variable-schemas": false
        }
      }
    ],
    "controlVariation": "variation-on",
    "variables": [
      {
        "_id": "644a9b0ef347df8289ea96d6",
        "_project": "61730d64529341ae237de2e9",
        "_feature": "64659286ff07741f83cece66",
        "name": "variable-schemas",
        "key": "variable-schemas",
        "type": "Boolean",
        "status": "active",
        "defaultValue": false,
        "source": "dashboard",
        "_createdBy": "google-oauth2|108470150099582715105",
        "createdAt": "2023-04-27T15:55:58.651Z",
        "updatedAt": "2023-05-18T02:50:46.619Z"
      }
    ],
    "tags": [],
    "readonly": false,
    "settings": {
      "optInEnabled": false,
      "publicName": "",
      "publicDescription": ""
    },
    "sdkVisibility": {
      "mobile": true,
      "client": true,
      "server": true
    }
  },
]

const mockCLITargeting = [{
	"_feature": "64659286ff07741f83cece66",
	"_environment": "61730d64529341ae237de2ec",
	"_createdBy": "google-oauth2|111813673098232645758",
	"status": "active",
	"startedAt": "2023-05-18T02:50:47.647Z",
	"updatedAt": "2023-06-09T18:52:55.831Z",
	"targets": [{
		"_id": "646f88229302b0862fd68199",
		"audience": {
			"name": "Nika",
			"filters": {
				"operator": "and",
				"filters": [{
					"type": "user",
					"subType": "email",
					"comparator": "=",
					"values": ["nika.salamadze@taplytics.com", "jsalaber@taplytics.com"]
				}]
			}
		},
		"distribution": [{
			"_variation": "64659286ff07741f83cece6b",
			"percentage": 1
		}]
	}, {
		"_id": "64775f8671ef8fe148afeaf4",
		"audience": {
			"name": "Not Adam",
			"filters": {
				"operator": "and",
				"filters": [{
					"type": "user",
					"subType": "email",
					"comparator": "=",
					"values": ["adam@taplytics.com"]
				}]
			}
		},
		"distribution": [{
			"_variation": "64659286ff07741f83cece6b",
			"percentage": 1
		}]
	}, {
		"_id": "64659287e2afd7dfb2055914",
		"audience": {
			"name": "All Users",
			"filters": {
				"operator": "and",
				"filters": [{
					"type": "all"
				}]
			}
		},
		"distribution": [{
			"_variation": "64659286ff07741f83cece6b",
			"percentage": 1
		}]
	}],
	"readonly": false
}]

const mockCachedTargeting = {
  "64659286ff07741f83cece66": [{
	"_feature": "64659286ff07741f83cece66",
	"_environment": "61730d64529341ae237de2ec",
	"_createdBy": "google-oauth2|111813673098232645758",
	"status": "active",
	"startedAt": "2023-05-18T02:50:47.647Z",
	"updatedAt": "2023-06-09T18:52:55.831Z",
	"targets": [{
		"_id": "646f88229302b0862fd68199",
		"audience": {
			"name": "Nika",
			"filters": {
				"operator": "and",
				"filters": [{
					"type": "user",
					"subType": "email",
					"comparator": "=",
					"values": ["nika.salamadze@taplytics.com", "jsalaber@taplytics.com"]
				}]
			}
		},
		"distribution": [{
			"_variation": "64659286ff07741f83cece6b",
			"percentage": 1
		}]
	}, {
		"_id": "64775f8671ef8fe148afeaf4",
		"audience": {
			"name": "Not Adam",
			"filters": {
				"operator": "and",
				"filters": [{
					"type": "user",
					"subType": "email",
					"comparator": "=",
					"values": ["adam@taplytics.com"]
				}]
			}
		},
		"distribution": [{
			"_variation": "64659286ff07741f83cece6b",
			"percentage": 1
		}]
	}, {
		"_id": "64659287e2afd7dfb2055914",
		"audience": {
			"name": "All Users",
			"filters": {
				"operator": "and",
				"filters": [{
					"type": "all"
				}]
			}
		},
		"distribution": [{
			"_variation": "64659286ff07741f83cece6b",
			"percentage": 1
		}]
	}],
	"readonly": false
}]}

let mockGetState: sinon.SinonStub<any[], any>, 
mockSetState: sinon.SinonStub<any[], any>, 
execDvcStub: sinon.SinonStub<[cmd: string], Promise<{ output: string; error: Error | null; code: number }>>

describe('featuresCLIController', () => {
  beforeEach(() => {
    mockSetState = sinon.stub()
    mockGetState = sinon.stub().returns(null)

    execDvcStub = sinon.stub(baseCLIController, 'execDvc').resolves({
        code: 0,
        output: JSON.stringify(mockCLIFeatures),
        error: null,
    })
    StateManager.getState = mockGetState
    StateManager.setState = mockSetState
  })

  afterEach(() => {
    sinon.restore()
  })

  describe('getAllFeatures', () => {
    it('should use cached features if available', async () => {
      mockGetState.returns(mockCachedFeatures)

      const result = await getAllFeatures()

      expect(result).to.deep.equal(mockCachedFeatures)
      sinon.assert.calledWith(mockGetState, 'features')
    })

    it('should use CLI to fetch features if none cached', async () => {
      const result = await getAllFeatures()

      assert.isTrue(execDvcStub.calledWithExactly('features get'))
      const expectedCLIResult = {
        "64659286ff07741f83cece66": mockCLIFeatures[0],
      }
      expect(result).to.deep.equal(expectedCLIResult)
    })
  })

    describe('getFeature', () => {
      it('should use cached features if available', async () => {
        mockGetState.returns(mockCachedFeatures)

        const result = await getFeature('64659286ff07741f83cece66')

        expect(result).to.deep.equal(mockCachedFeatures['64659286ff07741f83cece66'])
        sinon.assert.calledWith(mockGetState, 'features')
      })

      it('should use CLI to fetch features if none cached', async () => {    
        const result = await getFeature('varkey')

        assert.isTrue(execDvcStub.calledWithExactly("features get --keys='varkey'"))
        expect(result).to.deep.equal(mockCLIFeatures[0])
      })
    })

    describe('getFeatureConfiguration', () => {
      it('should use cached configuration if available', async () => {
        mockGetState.returns(mockCachedTargeting)

        const result = await getFeatureConfigurations('64659286ff07741f83cece66')

        expect(result).to.deep.equal(mockCachedTargeting['64659286ff07741f83cece66'])
        sinon.assert.calledWith(mockGetState, 'feature_configurations')
      })

      it('should use CLI to fetch features if none cached', async () => {    
        execDvcStub.restore()
        execDvcStub = sinon.stub(baseCLIController, 'execDvc').resolves({
          code: 0,
          output: JSON.stringify(mockCLITargeting),
          error: null,
      })
        const result = await getFeatureConfigurations('varkey')

        assert.isTrue(execDvcStub.calledWithExactly("targeting get varkey"))
        expect(result).to.deep.equal(mockCLITargeting)
      })
    })
})
