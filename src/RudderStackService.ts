import axios from "axios";
import * as vscode from 'vscode'
import { RUDDERSTACK_KEY } from "./analytics";
import { getOrganizationId } from "./cli";

type RudderstackEvent = {
  event: string,
  userId: string,
  properties: Record<string, unknown>
}

const rudderstackClient = axios.create({
  baseURL: 'https://taplyticsncs.dataplane.rudderstack.com/v1/',
  headers: {
      Authorization: `Basic ${RUDDERSTACK_KEY}`,
      'Content-Type': 'application/json'
  }
})

export const trackRudderstackEvent = async (
  eventName: string
): Promise<void> => {
  const sendMetrics = vscode.workspace.getConfiguration('devcycle-feature-flags').get('sendMetrics')
  if (sendMetrics) {
    const orgId = getOrganizationId()
    if (!orgId) { return }
    const event = {
      event: eventName,
      userId: orgId,
      properties: {
        a0_organization: orgId
      }
    }
    await rudderstackClient.post('track', event).catch((error) => {
      if (!axios.isAxiosError(error)) { return }
      if (error?.response?.status === 401) {
        console.error('Failed to send event. Analytics key is invalid.')
      } else {
        console.error('Failed to send event. Status: ', error?.response?.status)
      }
    })
  }
}
