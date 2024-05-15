import * as vscode from 'vscode'
import { RUDDERSTACK_KEY } from './analytics'
import { KEYS, StateManager } from './StateManager'

export const trackRudderstackEvent = async (
  eventName: string,
  orgId?: string,
): Promise<void> => {
  const sendMetrics = vscode.workspace
    .getConfiguration('devcycle-feature-flags')
    .get('sendMetrics')
  if (sendMetrics) {
    const userId = StateManager.getWorkspaceState(KEYS.AUTH0_USER_ID)
    if (!userId) {
      return
    }
    const event = {
      event: eventName,
      userId: userId,
      properties: {
        a0_organization: orgId,
      },
    }

    try {
      const response = await fetch(
        'https://taplyticsncs.dataplane.rudderstack.com/v1/track',
        {
          method: 'POST',
          body: JSON.stringify(event),
          headers: {
            Authorization: `Basic ${RUDDERSTACK_KEY}`,
            'Content-Type': 'application/json',
          },
        },
      )
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`)
      }
    } catch (e) {
      console.error('Failed to send event. Error: ', e)
    }
  }
}
