-- Keycloak owns its own persistence (19-security-operations-delivery.md:65 —
-- "identity provider has its own persistence and administrative interface"). A separate
-- database on the same local server keeps the boundary visible without a second
-- container; staging and production give it a separate server entirely.
CREATE DATABASE keycloak;
