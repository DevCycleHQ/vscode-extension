const sdkKeyRegex =
  /(dvc|client|mobile|server)[_-]([\da-f]{8})([_-][\da-f]{4}){3}[_-]([\da-f]{12})([_-][\da-f]{7})?/gi

export const redactSdkKey = (key: string): string => {
  return key.replace(sdkKeyRegex, (match: string) => {
    const firstPart = match.slice(0, 10)
    const lastPart = match.slice(-3)
    return `${firstPart}******${lastPart}`
  })
}
