#!/usr/bin/env node

import QRCode from 'qrcode-terminal'

const host = process.env.DESK_SUPPORT_HOST || 'localhost'
const port = process.env.DESK_SUPPORT_PORT || '4000'
const url = `http://${host}:${port}`

console.log('\n')
console.log('╔═══════════════════════════════════════════════════════════╗')
console.log('║              Open Desk Support in a browser               ║')
console.log('╚═══════════════════════════════════════════════════════════╝')
console.log('\n')

QRCode.generate(url, { small: true }, (qrCode) => {
  console.log(qrCode)
  console.log('\n📱 Open this address on a device on the same network:')
  console.log(`   ${url}`)
  console.log('\n')
})
