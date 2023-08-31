import * as loadRepoConfig from './loadRepoConfig'
import * as showDebugOutput from './showDebugOutput'
import * as loginAndRefresh from './loginAndRefresh'
import * as logout from './logout'
import * as checkForWorkspaceFolders from './checkForWorkspaceFolders'

export default {
  ...loadRepoConfig,
  ...showDebugOutput,
  ...loginAndRefresh,
  ...logout,
  ...checkForWorkspaceFolders
}
