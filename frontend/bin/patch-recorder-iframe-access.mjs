#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const defaultDistPath = path.resolve(__dirname, '..', 'dist')
const distPath = process.argv[2] ? path.resolve(process.argv[2]) : defaultDistPath

const recorderBundleNames = [
    'all-external-dependencies.js',
    'lazy-recorder.js',
    'posthog-recorder.js',
    'recorder-v2.js',
    'recorder.js',
]

const injectionMarker = '__ph_safe_contentDocument'
const strictModeBanner = '"use strict";'
const iframeContentDocumentPatch = `!function(){try{var t=Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype,"contentDocument");if(!t||!t.get||t.get.${injectionMarker})return;var e=t.get,r=function(){var t=this.getAttribute("src");if(t&&"about:blank"!==t)try{var r=new URL(t,document.location.href);if("null"!==r.origin&&r.origin!==document.location.origin)return null}catch(t){}try{return e.call(this)}catch(t){return null}};r.${injectionMarker}=!0,Object.defineProperty(HTMLIFrameElement.prototype,"contentDocument",{configurable:t.configurable,enumerable:t.enumerable,get:r})}catch(t){}}();`

for (const bundleName of recorderBundleNames) {
    const bundlePath = path.join(distPath, bundleName)

    if (!fs.existsSync(bundlePath)) {
        continue
    }

    const source = fs.readFileSync(bundlePath, 'utf8')

    if (source.includes(injectionMarker)) {
        continue
    }

    if (source.startsWith(strictModeBanner)) {
        fs.writeFileSync(bundlePath, `${strictModeBanner}${iframeContentDocumentPatch}${source.slice(strictModeBanner.length)}`)
        continue
    }

    fs.writeFileSync(bundlePath, `${iframeContentDocumentPatch}${source}`)
}
