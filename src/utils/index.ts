import * as loadRepoConfig from './loadRepoConfig'
import * as showDebugOutput from './showDebugOutput'
import * as loginAndRefresh from './loginAndRefresh'

export default {
  ...loadRepoConfig,
  ...showDebugOutput,
  ...loginAndRefresh
}