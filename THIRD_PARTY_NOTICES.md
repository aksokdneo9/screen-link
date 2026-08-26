# Third-party notices

Screen Link uses the following third-party software. These notices cover the versions declared by the current source tree.

## Distributed with the Android application

| Component | Version | License | Source |
| --- | --- | --- | --- |
| NanoHTTPD and NanoHTTPD WebSocket | 2.3.1 | BSD 3-Clause | https://github.com/NanoHttpd/nanohttpd |
| AndroidX Core | 1.13.1 | Apache License 2.0 | https://github.com/androidx/androidx |
| AndroidX Activity Compose | 1.9.1 | Apache License 2.0 | https://github.com/androidx/androidx |
| AndroidX Lifecycle Runtime | 2.8.4 | Apache License 2.0 | https://github.com/androidx/androidx |
| Jetpack Compose and Material Icons | BOM 2024.06.00 | Apache License 2.0 | https://github.com/androidx/androidx |
| Kotlin standard library | 1.9.22 | Apache License 2.0 | https://github.com/JetBrains/kotlin |
| kotlinx.coroutines Android | 1.8.1 | Apache License 2.0 | https://github.com/Kotlin/kotlinx.coroutines |
| Google Play services Code Scanner | 16.1.0 | Android SDK License | https://developers.google.com/ml-kit/vision/barcode-scanning/code-scanner |

## Distributed with the pairing pages

| Component | Version | License | Source |
| --- | --- | --- | --- |
| PeerJS client | 1.5.5 | MIT | https://github.com/peers/peerjs |
| @msgpack/msgpack (bundled by PeerJS) | 2.8.0 | ISC | https://github.com/msgpack/msgpack-javascript |
| eventemitter3 (bundled by PeerJS) | 4.0.7 | MIT | https://github.com/primus/eventemitter3 |
| peerjs-js-binarypack (bundled by PeerJS) | 2.1.0 | MIT | https://github.com/peers/peerjs-js-binarypack |
| webrtc-adapter (bundled by PeerJS) | 9.0.1 | BSD 3-Clause | https://github.com/webrtcHacks/adapter |
| QRCode.js | 1.0.0 | MIT | https://github.com/davidshimjs/qrcodejs |

PeerJS and QRCode.js are stored as versioned local assets in `docs/assets/vendor/`. PeerJS is also bundled in the Android app solely for the local pairing bridge. PeerJS and QRCode.js license texts, including the notices for dependencies bundled into PeerJS, are retained in `licenses/`, `docs/licenses/`, and the app's legal assets.

## Repository build tooling

| Component | Version | License | Source |
| --- | --- | --- | --- |
| Gradle Wrapper | 8.7 | Apache License 2.0 | https://github.com/gradle/gradle |
| Android Gradle Plugin | 8.5.2 | Apache License 2.0 | https://android.googlesource.com/platform/tools/base |
| Kotlin Gradle Plugin | 1.9.22 | Apache License 2.0 | https://github.com/JetBrains/kotlin |
| JUnit (tests only) | 4.13.2 | Eclipse Public License 1.0 | https://github.com/junit-team/junit4 |

The complete license texts required for redistributed components are stored in [`licenses/`](licenses/).

## Castla reference

[Castla](https://github.com/Suprhimp/castla) was reviewed as an architectural and compatibility reference. Screen Link's `TunTcpRelay` is based on Castla's Apache-2.0-licensed prototype and has been modified substantially to add acknowledgement tracking, flow control, retransmission, stricter packet parsing, and Screen Link integration.

Castla — Copyright (C) 2024 Castla. The Apache License 2.0 text and the applicable Castla NOTICE are retained with this distribution.

Screen Link's own source-code license is separate from these third-party licenses.
