# Bahlou Geo Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add private multiplayer Street View games to Bahlou.
**Architecture:** Separate in-memory Geo engine using existing authenticated routes and targeted WebSocket broadcasts. A vanilla browser module owns the Google Maps lifecycle and fits the existing navigation.
**Tech Stack:** Node.js >=18, native node:test, vanilla JS/CSS, Google Maps JavaScript API.
**Spec:** ../specs/2026-11-13-bahlou-geo-design.md (approved).

## Global Constraints

- Work on feature/bahlou-geo; commits attributed to Meoxy-arlert without Codex attribution.
- No server dependencies, no billing changes, no API keys in source, no deployment or merge.
- 2–12 players, 5 rounds, 90 seconds, distance score rounded from 5000*exp(-km/2000).
- Sessions reused, rooms private, no bets. Rooms expire after one hour inactive.
- Google imagery is required for actual play; missing or rejected configuration must be explicit.

## Review Focus

- Old requests after next/rematch must not modify a new round: round IDs and stale-action tests.
- Browser reload/reconnect must preserve guesses and timer: authenticated state recovery tests.
- Leaving host or all players must not strand a room: lifecycle tests.
- Google blocked, missing panorama, slow script: bounded loader and preparation errors, visible retry.
- Async responses after leaving Geo must not recreate maps: lifecycle guards and browser inspection.

### Task 1: Geo engine and route contract

**Files:** geo.js, tests/geo.test.js.
**Interfaces:** createGeo({routes,send,readBody,broadcast,apiKey,now,randomInt,timers}) returns {close}; distanceKm(a,b), score(km) exported for numeric proof.
- [x] Write failing tests for auth, create/join, owner rights, prepare/start, guess, deadline, scoring, hidden answers, duplicate/stale actions, departure, rematch and expiry.
- [x] Run node --test tests/geo.test.js; observe missing module failure.
- [x] Implement GET /api/geo/config, GET /api/geo/state and POST /api/geo/{create,join,prepare,start,guess,next,rematch,leave}. State: {room,serverNow}; room contains code,host,phase,version,players,round,result,history. Round: {id,number,total,panoId,deadline,guess}; answer coordinates only in result/history.
- [x] Run tests to green and commit engine/tests.

### Task 2: Browser module and application integration

**Files:** public/geo.js, public/geo.css, public/index.html, public/club.js, public/app.js, server.js, tests/geo-http.test.js.
**Interfaces:** Geo.open(code), Geo.stop(), Geo.bind(es), Geo.refresh(). Uses Task 1 routes/state, existing api() and state.me; navigation #/geo and #/geo/CODE.
- [x] Write HTTP tests launching an isolated real server: auth required, existing registration cookies, two-user lifecycle, served assets and missing-key behavior. Run to red before integration.
- [x] Add Geo install/server shutdown, navigation view and script/styles; bind/resync Geo through existing WebSocket wrapper.
- [x] Implement lobby/create/join/copy/start, host-only candidate preparation with StreetViewService, asynchronous Google loader with timeout/retry, independent panorama and guess map, countdown synchronized to server, map results and final ranking, rematch/leave, mobile layout and keyboard coordinate entry.
- [x] Protect navigation and view teardown against stale loads; ignore stale state versions; preserve panorama on other players' updates.
- [x] Run node --test tests/*.test.js, node --check on changed JS; inspect desktop/mobile with local isolated test data. Live Google verification requires user-provided configuration.
- [x] Commit interface/integration.

### Task 3: Configuration, review, delivery

**Files:** README.md; implementation files only for observed defects.
- [x] Document GOOGLE_MAPS_API_KEY setup, HTTP referrer/API restrictions, costs/quotas, required API, ephemeral rooms, casual-play trust model and verification commands.
- [x] Fresh whole-branch review; fix important findings with focused failing/passing regressions.
- [x] Run full suite, syntax checks and git diff --check; verify author metadata/no co-author trailers.
- [x] Commit final changes to feature/bahlou-geo; use GitHub UI if connector cannot write. No merge or deployment.

## Execution evidence

- Engine: 10 tests passed; HTTP integration: 2 passed; client race regressions: 2 passed.
- Fresh review found one important navigation race; reproduced RED then fixed GREEN.
- Desktop/mobile home, missing-key message, lobby and reload inspected; no console errors observed.
- Google imagery remains unverified without a real configured key.
- Git HTTPS has no terminal credentials and the connector cannot write; publish the verified source through the signed-in GitHub UI.
- Verified GitHub UI commits for all product/test files against the locally tested source: no differences. Browser uploads produce separate commits from the local implementation history, all authored by Meoxy-arlert.
