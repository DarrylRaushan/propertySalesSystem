# API error review

The original predeploy error is consistent with a static workspace serving the application HTML fallback for `/api/trpc`. The workspace has now been upgraded to include database, server, and user capabilities so the Express tRPC handler can be routed by the managed gateway.

Immediately after the capability upgrade, the in-chat preview reports that the site is under modification while the managed previewer restarts. The next verification step is to confirm the running Express process answers `/api/trpc` with a JSON content type once the previewer is available.
