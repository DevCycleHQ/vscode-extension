const DVC = require('@devcycle/nodejs-server-sdk')

const DVC_SERVER_SDK_KEY = '<YOUR_DVC_SERVER_SDK_KEY>'
let dvcClient

async function main() {
    dvcClient = DVC.initialize(DVC_SERVER_SDK_KEY, {
        logLevel: 'info',
        enableCloudBucketing: true,
    })

    const someVariable = dvcClient.variableValue(
        {
            user_id: 'someUser',
        },
        'some-variable',
        true,
    )
}

main()

