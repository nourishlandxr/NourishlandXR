# Tutorial voice request repair

Production accepted the root site's voice requests but returned HTTP 403, `Request origin is not allowed`, for `https://www.nourishland.org`. Voice requests now accept the configured HTTPS site and its root/www alias. Unrelated sites, different ports and HTTP remain rejected. Creator authentication and origin checks are unchanged.

The production API also lacked `/zinnia/interpret`, while the current source mistakenly treated that route as audio synthesis. It now validates name/fruit context and returns grounded structured JSON through the existing interpreter.

The manual `Repair Zinnia voice API` workflow updates only `zinniaVoiceServer.mjs` and `zinniaInterpretation.mjs` in the documented Passenger application root. It verifies the existing root and server import, backs up the old modules, restarts Passenger, and checks unauthenticated access from both website addresses. It does not deploy the persistence server, environment, authentication configuration or workspace. The normal frontend workflow retains its existing deployment boundary.
