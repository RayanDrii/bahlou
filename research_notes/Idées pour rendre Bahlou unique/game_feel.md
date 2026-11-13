# Game feel, juice, sound and interface animation for Bahlou

Evidence labels used below:
- **Local probe**: run on 2026-11-09 against the project's own Electron binary (`desktop/node_modules/electron`, Electron 33.2.1, Chromium 130.0.6723.137), once with GPU and once with `app.disableHardwareAcceleration()`. Machine: i5-11400H, Intel UHD (Mesa). This is first-hand measurement, so it has no URL. It is stronger than a compatibility table for "does it exist in our runtime", and weaker for "how fast is it on a friend's laptop".
- **Classic** marks talks older than 2023.
- Items under "Inferences" are this researcher's design proposals and reasoning. They are not sourced facts.

## What are the principles of game juice, and how did Balatro achieve its feel?

### Takeaway
The durable principle is that one input should produce a burst of coordinated, proportional output, with a very short moment of stillness at the point of impact. Bahlou already has the output (shake, particles, banners) and is mostly missing the timing layer: hit stop, anticipation, a tally that builds, and sound that climbs. Balatro's feel is widely praised, but almost every technical "breakdown" online is reconstruction rather than developer fact.

### Cited Findings
**Classic talks**
- Classic (Nov 2013): Jan Willem Nijman's "The Art of Screenshake" was given at the Control Conference in Amsterdam, and demonstrated 30 minor tweaks on a dull shooter. Named examples include shaking the screen slightly opposite to the direction of fire and a 33% chance that enemies explode harmlessly on death — [Game Developer](https://gamedeveloper.com/design/vlambeer-co-founder-shares-advice-on-building-better-action-games)
- Classic (2012): Martin Jonasson and Petri Purho's "Juice it or lose it" builds up a block-breaker layer by layer with particles, shake, sound and animation — [Game Juice resources](https://gamejuice.pages.dev/resources/juice-it-or-lose-it). Jonasson defines juicy things as those that "wobble, squirt, bounce around, and make little cute noises", a "maximum output for minimum input" idea — [Game Developer](https://gamedeveloper.com/design/video-is-your-game-juicy-enough-). Venue conflict: Game Developer says GDC Europe, other sources say Nordic Game.
- Classic (2015): Masahiro Sakurai on hit stop: attacker and victim freeze for the same exact time, stronger attacks freeze longer, a maximum cap limits the strongest hits, and individual attacks get modifiers (projectiles less, electric more). The struck character vibrates and the vibration fades during the freeze. Grounded characters shake sideways and airborne ones vertically. The flinch pose transitions over four frames during the freeze. Freezes that are too long slow the game, and in Smash a freeze hands a third player an opening — [Source Gaming translation of the Famitsu column](https://sourcegaming.info/2015/11/11/thoughts-on-hitstop-sakurais-famitsu-column-vol-490-1/)
- Classic (2016): Squirrel Eiserloh's GDC talk "Math for Game Programmers: Juicing Your Cameras With Math" covers the maths of camera behaviour including screen shake — [GDC Vault](https://gdcvault.com/play/1023146/Math-for-Game-Programmers-Juicing), [Game Developer](https://www.gamedeveloper.com/programming/video-sprucing-up-cameras-with-math)

**Balatro**
- LocalThunk (developer, first-hand): "Creating the tactile and juicy feel of the cards/effects became my obsession and is the only reason Balatro exists today" — [X post](https://x.com/LocalThunk/status/1860092451660398933)
- The Washington Post attributes the game's appeal to a pleasant interface and rewarding audio feedback tied to watching numbers climb — [Washington Post](https://css.washingtonpost.com/entertainment/video-games/2024/09/26/balatro-mobile-release-localthunk-interview/)
- The art followed deliberate constraints on palette, resolution, UI standardisation and card sets, for cohesion — [DayOne interview](https://playday.one/2024/03/09/there-is-a-lot-more-design-to-explore-within-balatro/)
- Balatro is built in Lua on LÖVE, and its files are readable by anyone who owns the game — [GameFromScratch](https://gamefromscratch.com/balatro-made-with-love-love2d-that-is/). A sound mod confirms `play_sound` accepts a pitch value applied to the audio source — [Balatro-Custom-Sound-Player](https://github.com/Infarctus/Balatro-Custom-Sound-Player/blob/main/sound.lua)
- Reconstruction, not developer fact: one design guide describes chips rolling up before the multiplier, per-digit staggered rolling, a rising note per scored card (C, D, E, F, G), a separate layer for multiplier triggers, a bass drop at thresholds, ±3° random card rotation, jokers pulsing left to right with the total updating after each one, and shake tiers tied to score. It presents shake as a data channel that signals hand size before the number appears. All thresholds and CSS there are the author's illustrations — [Blake Crosley guide](https://blakecrosley.com/guides/design/balatro)

### Inferences
Concrete additions for Bahlou, in rough order of value:

1. **Hit stop on every "final" event.** Freeze 50 to 120 ms just before the existing shake and banner fire, scaled by stake, with a hard cap (Sakurai's cap). Bahlou is turn-based, so Sakurai's multiplayer objection does not apply. Implementation: a `freezeUntil` timestamp checked in the FX `requestAnimationFrame` loop, and `document.getAnimations().forEach(a => a.pause())` for CSS animations on the table, then `.play()`. During the freeze, draw one white or red silhouette frame.
2. **One `FX.impact(level)` entry point.** Today `shake`, banners and sounds are called separately. A single number that sets freeze length, flash, shake, particle count and sound means every effect scales together, which is what Balatro's reported shake tiers and Sakurai's duration scaling have in common.
3. **Silence before the blow.** On the frame the freeze begins, duck music and ambience by 6 to 10 dB for about 150 ms, so the impact arrives against a quiet backdrop. This costs a single gain automation.
4. **Tally ladder (Balatro-style).** Never show a final payout directly. Count in discrete steps: base, then each multiplier, each step with a bump (`scale` spring on the number block), and a pitch that rises one semitone: `freq * 2 ** (step / 12)`. The existing `slide()` in `public/fx.js` already takes frequencies, so this needs no new audio code. Let the block grow and the type go heavier as the number grows. Big Shoulders is condensed, so a growing number stays on screen.
5. **Pitch-laddered risk.** Each safe mine revealed or tower floor climbed raises a semitone, and resets on cash-out or loss. Players learn to hear how deep they are. Cap at about an octave and a half, then keep the top note and add a higher layer instead, or it turns into a whine.
6. **Anticipation pose.** Before a deal, reveal or explosion, move 2 to 4% against the direction of travel for 80 to 120 ms. Cards pull back before being thrown, the tower dips before it collapses.
7. **Squash and stretch on flat blocks.** Bahlou's flat poster blocks suit it well. Compress on the axis of impact and expand on the other, keeping area roughly constant (`scaleY(.86) scaleX(1.12)`), with `transform-origin` at the contact edge. The origin matters: scaling from the centre reads as resizing rather than landing.
8. **Chromatic aberration only as a single-frame hit.** Keep it on the PERDU and win words only, for 150 to 250 ms, decaying to zero. The cheapest form measured was an animated `text-shadow` (see the performance section): `@keyframes ca { from { text-shadow: .06em 0 #ff0044, -.06em 0 #00e5ff } to { text-shadow: 0 0 #ff0044, 0 0 #00e5ff } }`. It is on-brand too: it reads as a misregistered screen-print, which suits the poster identity better than a CRT effect.
9. **Rotation in the shake.** Use a seeded noise signal rather than per-frame random, add a small rotation, and apply a directional kick (Nijman's opposite-direction shake). For instance a coin rain pushes down, an explosion pushes away from the tile.
10. **Random variation on repeated sounds.** Apply ±3% pitch and slight gain variation to chips and card deals, so repetition does not become audible. The Balatro material above points the same way, but its details are unconfirmed.

### Gaps
- No primary source found for Balatro's shader implementation, score-flame effect, or exact pitch curve. A reverse-engineering page exists ([DeepWiki](https://deepwiki.com/balatro-src/balatro-src-reverse-engineering/5.3-sound-effects-and-music)) but returned HTTP 429. Someone who owns the game can read the Lua and shader files directly.
- The full list of Nijman's 30 tweaks and any frame counts were not recoverable without the video.
- The popular `shake = trauma²` formulation is commonly associated with Eiserloh's talk, but the sources retrieved did not confirm it. It remains a sensible design choice.
- No trustworthy frame-count data for hit stop. The freeze values in item 1 are a starting point to tune by hand.

## How do casino and arcade interfaces build tension, and what is fair for a no-money friend game?

### Takeaway
Tension itself is fine. What makes casino design manipulative is misrepresentation: presenting a loss as a win, or implying that the player was close. Bahlou's rule should be technical: **animation timing may use only information that is already public at that moment, and never the hidden result.**

### Cited Findings
- A patent for anticipation lighting describes anticipatory sound and controlled slowdown of the remaining reels after special symbols land, with light, colour and sound intensifying as reels show a potentially high reward — [US9047740](https://patents.google.com/patent/US9047740)
- A 2017 systematic review found near misses significantly more arousing, motivating and frustrating than losses, and found that losses disguised as wins (LDWs) lead players to overestimate how much they are winning — [Journal of Gambling Studies review, PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC5663799/)
- An LDW pays less than the wager but is celebrated like a win — same review. Near misses were associated with elevated skin conductance — [Barton et al. 2017 abstract](https://experts.mcmaster.ca/scholarly-works/1575653). A 2016 Canadian study is described as showing players "tricked by way of their physiology" into feeling that they are winning — [Oxford Practical Ethics blog](https://blog.practicalethics.ox.ac.uk/author/hannah-maslen/page/4/)
- Dixon et al. (2013, 96 gamblers): sound raised arousal, and players overestimated wins by 24% with sound against 15% without. These figures come from press coverage of the paper — [University of Waterloo](https://uwaterloo.ca/news/news/music-gamblers-ears), [ScienceDaily](https://sciencedaily.com/releases/2013/07/130702100348.htm)
- UK online slot rules from October 2021 banned autoplay and features that speed up play or give a false sense of control, set a minimum 2.5 seconds between game cycles, and targeted celebration of disguised losses — [Wiggin](https://www.wiggin.co.uk/insight/gambling-commission-announces-package-of-changes-to-make-online-games-safer-by-design/), [RPC](https://www.rpclegal.com/snapshots/consumer/spring-2021/making-online-games-safer-by-design/). The regulator's newer remote game design requirements came into force on 17 January 2025 — [Gambling Commission](https://www.gamblingcommission.gov.uk/consultation-response/summer-2023-consultation-proposed-changes-to-lccp-and-rts-consultation/summary-game-design)
- Newall (2018) calls these features "dark nudges" designed to exploit biases — [Journal of Gambling Studies editorial](https://link.springer.com/article/10.1007/s10899-017-9688-0)
- Adaptive music: vertical layering, meaning stems that play in sync and fade in with game state, is described as the most common adaptive technique — [Abratabia guide](https://www.abratabia.com/web-game-audio/dynamic-game-music.php)

### Inferences
**Fine for Bahlou (tension from true state)**
- Reveal slowdown as a function of *displayed* risk, not of the result: `revealMs = 90 + 300 * shownBombProbability`. The same delay applies whether the tile is safe or not. Besides being honest, this avoids a timing side channel where a longer delay betrays the outcome.
- Slowing the last community card or dealer hole card only when the public board makes it decisive.
- A tension music stem that enters when the real stake rises, and leaves on cash-out.
- A short, skippable hold before a big reveal, when friends are watching. In a friend game, the anticipation is social: show other players' faces or reactions during the hold. A casino cannot do this.
- Reels or wheels that slow down as a fixed part of every spin.

**Avoid, even with no money**
- Choosing the displayed "almost" outcome after the result is known (fake near misses). `public/fx.js` already states that nothing there changes a result, and that line is worth keeping as a project rule.
- Any win celebration when the round is net negative. Gold banner and rising sound only when net result is above zero; a partial refund gets a neutral, small treatment.
- "So close!" copy or a prompt to replay placed on the loss screen.
- Autoplay, turbo modes aimed at volume, and streak-break or "come back" pressure.
- Asymmetric volume where wins are loud and losses are silent. Bahlou's full-screen red PERDU is, by contrast, a healthy design: losses are as legible as wins, and comedy replaces denial.
- Hiding the running balance or converting currency to obscure it.

A cheap check: mute the sound and hide the animation, and ask whether the player would still reach the same belief about what happened. If the answer differs, the juice is lying.

### Gaps
- The research covers real-money gambling. I found no study on these techniques in no-money social play, so applying the concern to Bahlou is a precaution rather than a finding.
- The UK "celebrating wins below stake" wording was not read directly in the current technical standards. It is taken from law-firm summaries.
- No credible designer-authored account of anticipation timing values turned up. Published figures come from promotional sites and are excluded. The same applies to claims about crescendo and music layers in slot play: beyond the patent, the sources were promotional and could not be checked.

## What is possible on the web in 2025-2026, and what works in Electron 33 (Chromium 130)?

### Takeaway
Chromium 130 is a strong target for CSS-first motion: View Transitions (including classes and types), scroll-driven animation, `@property`, `linear()` springs, Popover, anchor positioning, and `@starting-style` all exist. WebGPU is effectively unavailable. The newest conveniences such as `sibling-index()`, nested view-transition groups and `if()` are absent.

### Cited Findings
**Local probe results, Chromium 130.0.6723.137 (identical with and without GPU unless noted):**

| Feature | Status in Electron 33 |
|---|---|
| `document.startViewTransition`, `::view-transition-group(.class)`, `view-transition-class` | Yes |
| View transition types (`ViewTransition.types`, `:active-view-transition-type()`) | Yes |
| Cross-document (`@view-transition`, `pageswap`, `pagereveal`) | Yes |
| `view-transition-group: contain` (nested groups) | **No** |
| `document.activeViewTransition`, `ViewTransition.waitUntil`, element-scoped transitions | **No** |
| Scroll-driven: `animation-timeline: scroll()/view()`, `animation-range`, `timeline-scope`, `ScrollTimeline`, `ViewTimeline` | Yes |
| `@property`, `CSS.registerProperty`, `CSS.paintWorklet` | Yes |
| `linear()` easing, `animation-composition` | Yes |
| `@starting-style`, `transition-behavior: allow-discrete` | Yes |
| `interpolate-size`, `calc-size()` (animate to `auto`) | Yes |
| Popover API (`showPopover`) | Yes |
| `popover="hint"`, invoker `command`/`commandfor`, `interestfor`, `dialog.requestClose()` | **No** |
| Anchor positioning: `anchor-name`, `position-anchor`, `position-area`, `anchor()`, `anchor-size()`, `position-try-fallbacks`, `@position-try`, `position-visibility` | Yes |
| `clip-path: polygon()/xywh()`, `offset-path: ray()` | Yes |
| `clip-path: shape()` | **No** |
| `color-mix()`, relative colour syntax, `oklch()`, `light-dark()` | Yes |
| `@scope`, `@layer`, `@container` and style queries, `:has()`, trigonometric `sin()`, `round()`, `mod()` | Yes |
| `text-wrap: balance/pretty`, `field-sizing` | Yes |
| `sibling-index()`, `if()`, `@function`, `corner-shape`, `text-box`, typed `attr()`, `animation-trigger`, `::scroll-button`, `::details-content`, `moveBefore()`, `Animation.overallProgress` | **No** |
| `AudioWorkletNode`, `OfflineAudioContext`, `AudioContext.setSinkId`, `AudioDecoder` | Yes |
| `OffscreenCanvas`, `createImageBitmap`, WebGL2, Canvas `filter`, `reset`, `roundRect` | Yes |
| `scheduler.yield`, `scheduler.postTask`, `PressureObserver` (source `cpu`), `long-animation-frame` entries | Yes |
| WebGPU: `navigator.gpu` exists, `requestAdapter()` returns `null`, status `disabled_off` | **Not usable** |

- Probe caveats: `CSS.supports('view-transition-name: match-element')` returned true, but that is only a valid name parse, because the keyword shipped in Chrome 137 — [Chrome blog](https://developer.chrome.com/blog/view-transitions-in-2025). `@container scroll-state()` parsed without error, which proves nothing because unknown container queries are retained, so treat it as absent.
- Electron 33.0.0 moved to Chromium 130.0.6723.44, and later patches stayed on the 130 line — [Electron blog](https://electronjs.org/blog/electron-33-0)
- Version anchors from Chrome: same-document view transitions 111, `match-element` 137, nested groups 140, `document.activeViewTransition` 142; element-scoped transitions were experimental with support data listing 147. Firefox 144 made same-document transitions Baseline, but its initial implementation omits types — [Chrome blog](https://developer.chrome.com/blog/view-transitions-in-2025)
- `linear()` shipped in Chrome 113, Firefox 112 and Safari 17.2. It approximates springs and bounces by sampling a curve into many stops, and Jake Archibald and Adam Argyle's generator does this conversion. Fewer stops give a rougher curve — [Chrome for Developers](https://developer.chrome.com/docs/css-ui/css-linear-easing-function)
- WebGPU on Chrome for Linux arrived in 144 for Intel and 147 for NVIDIA, so it is out of reach for Electron 33 — [Wikipedia](https://en.wikipedia.org/wiki/WebGPU). Coverage on Linux depends on GPU generation, per a less authoritative guide — [Cinevva](https://app.cinevva.com/de/guides/webgl-webgpu-not-supported-fix)
- Rive web packages: `webgl2` uses the Rive Renderer and is recommended by Rive. `canvas` uses Canvas2D, `canvas-lite` drops text, layout, audio and scripting, and `canvas-single` inlines the WASM. Rive says to measure on real devices — [Rive docs](https://rive.app/docs/runtimes/web/canvas-vs-webgl)
- ZzFX is an MIT-licensed sound generator under 1 KB compressed. It has 20 parameters and renders a buffer that plays through Web Audio — [ZzFX](https://github.com/KilledByAPixel/ZzFX)
- Web Audio scheduling needs a lookahead because JS timers are imprecise. One tutorial uses a 0.15 s lookahead on a 0.1 s tick — [IRCAM tutorial](https://ircam-ismm.github.io/webaudio-tutorials/scheduling/timing-and-scheduling.html). Lookahead depends on the UI thread and can be throttled in background tabs — [Georgia Tech](https://repository.gatech.edu/entities/publication/ac112129-16e6-44b3-872b-ed063a32a5df)
- A guide recommends starting with vertical layering, adding horizontal re-sequencing only when needed, and routing stingers through the music gain chain without restarting the music — [Abratabia](https://abratabia.com/ai-game-audio/adaptive-music.php)

### Inferences
**Worth building (ordered by value for effort)**

1. **Spring tokens with `linear()`.** Generate a small set at build time or page load, and use them everywhere instead of hand-picked cubic-beziers:
   ```js
   // Underdamped spring step response, sampled into a CSS easing.
   function springCSS({ damping = .6, freq = 2.2, dur = .7, n = 24 } = {}) {
     const w = 2 * Math.PI * freq, wd = w * Math.sqrt(1 - damping * damping), s = [];
     for (let i = 0; i <= n; i++) {
       const t = dur * i / n;
       s.push(+(1 - Math.exp(-damping * w * t) *
         (Math.cos(wd * t) + (damping * w / wd) * Math.sin(wd * t))).toFixed(3));
     }
     s[n] = 1;
     return `linear(${s.join(',')})`;
   }
   root.style.setProperty('--spring-pop', springCSS());
   ```
   Pair each easing with its `dur` as a token, because the curve is only correct at that length.
2. **Shared-element view transitions for meaning, not for navigation.** Game tile expands into its table, a friend's avatar flies to their seat, a card moves from the list to the profile. Use `document.startViewTransition({ update, types: ['to-table'] })`, and `view-transition-class` to style groups. Keep the giant-word wipes for page changes. Feature-detect, since Firefox lacks types. In lite mode, apply `html { view-transition-name: none }` so that only the named element is captured (measured at about half the CPU below).
3. **`@property` foil on rare cards and rank badges.** A registered `--a: <angle>` driving a conic gradient, masked to the card. It extends the existing 3D tilt and glare. The tilt pointer position can drive the same variable, so foil responds to the cursor.
4. **Popover, anchor positioning and `@starting-style` for profile cards and reaction pickers.** Native top layer and light dismiss, `position-try-fallbacks: flip-block` to stay on screen, and animated entry and exit with `transition-behavior: allow-discrete`. This replaces JS positioning code. Check `CSS.supports('anchor-name: --a')` for the browser build, because support outside Chromium was not verified here.
5. **Adaptive music by vertical layering.** Start all looping `AudioBufferSourceNode`s at one `ctx.currentTime + .1`, each through its own `GainNode`, and move gains with `setTargetAtTime`. Suggested layers: lobby bed, table percussion, tension stem, win lift. For a fully procedural route that fits the current synthesised SFX, use a lookahead sequencer with a 100 ms window.
6. **A master audio bus.** In `public/fx.js`, each voice connects straight to `a.destination`, so stacked sounds (coin rain, then a win jingle) can sum past full scale and clip. Route everything through master gain → `DynamicsCompressorNode` → destination, with separate music and SFX buses, so ducking and a volume slider become one-liners. This is the single cheapest quality gain in audio.
7. **Scroll-driven polish, used sparingly.** A condensing leaderboard header, or history rows that settle in with `animation-timeline: view()`. Bahlou is not scroll-led, so this ranks low.

**Skip for now**
- WebGPU: unavailable in this runtime.
- Rive, unless a real mascot is planned: it adds a WASM runtime to a no-framework app. It earns its cost only with state-machine characters. A hand-drawn SVG mascot with a few CSS states gets further for less.
- Paint Worklets: exist, but nothing here needs them over `@property` and canvas.

### Gaps
- Lottie and dotLottie were not assessed in depth. Search results were dominated by agency marketing.
- Rive's bundle and WASM sizes are not stated in its docs.
- Whether Firefox and Safari support each feature for friends on the browser build was not checked feature by feature. Treat everything newer than `@property` as progressive enhancement there.
- `PressureObserver` presence and `knownSources` were confirmed, but a live pressure stream was not exercised.
- Effects of upgrading Electron were not evaluated. It would unlock `sibling-index()`-style stagger and nested groups, at unknown migration cost.

## What micro-interaction trends define premium apps now?

### Takeaway
Premium feel comes from respecting frequency, responding instantly, and staying interruptible more than from richer animation. The key consequence for Bahlou is a two-tier motion budget: spectacle for rare, high-stakes moments, and near-zero motion for anything repeated dozens of times per day.

### Cited Findings
- Animations should usually be under 300 ms, with `ease-out` for responsiveness. Animate `transform` and `opacity`. Consider how often users will see an animation, never animate keyboard-initiated actions repeated many times a day (Raycast has no animations), and use reduced-motion alternatives such as fades. CSS transitions can be redirected before finishing. Vercel's dashboard tab animation dropped frames during page loads under `requestAnimationFrame` and was fixed by moving to CSS — [Emil Kowalski](https://emilkowal.ski/ui/great-animations)
- High-frequency, low-novelty actions should animate less. Show the response immediately, then animate past a threshold. Destructive actions commit only when a gesture ends. Motion should keep the momentum and angle of the throw, and elements should come from where they logically live (spatial consistency) — [Rauno, "Invisible Details of Interaction Design", 2023](https://rauno.me/craft/interaction-design)
- Classic (2018): Apple's "Designing Fluid Interfaces" treats latency as disconnecting, requires interruptible and redirectable motion, and replaces duration thinking with two spring controls: damping ratio and response. Start at 100% damping and add bounce only where the gesture carries momentum (Music uses 100% for a tap to open and 80% for a swipe to dismiss). A thrown object should be projected from velocity to its likely resting place and retargeted. Rubber-banding shows limits, so that an edge does not feel like a freeze — [Apple WWDC18](https://developer.apple.com/videos/play/wwdc2018/803/)
- Linear's UI redesign moved from HSL to perceptually uniform LCH, generating themes from three variables (base, accent, contrast) instead of 98 per theme. Its stated polish is the kind "you'll feel after a few minutes of using the app", such as alignment of labels, icons and buttons. The article says nothing about motion — [Linear](https://linear.app/now/how-we-redesigned-the-linear-ui)
- Duolingo characters run on a Rive State Machine: separate body and mouth states, 20+ mouth shapes per character, phoneme timing driving visemes in sync with the audio, idle behaviour such as blinks and nods, and a final state that reacts to right or wrong answers. Timing data needs far less bandwidth than video — [Duolingo blog](https://blog.duolingo.com/world-character-visemes). Blended states avoid pre-rendering each reaction — [Rive](https://rive.app/blog/duolingo-s-ai-powered-video-call-brings-lily-to-life)
- Arc's first launch turns the screen into a black hole with animation and sound, according to one user's account — [UX Collective](https://uxdesign.cc/why-the-arc-browser-is-the-chrome-replacement-ive-been-waiting-for-1e0a05da9fc9)

### Inferences
- **Motion tiers.** Tier 0 (chat send, tab switch within a section, typing, repeated bets): under 120 ms or none. Tier 1 (buttons, card lift, popovers): under 250 ms spring. Tier 2 (round end, reveal, big win): the full show, which may be long and should be skippable by click.
- **Decaying page wipes.** Full giant-word wipes on first entry or after a long gap. A shortened version when a user switches back within a few seconds. Fifty wipes a day at full length would become the thing people complain about.
- **Everything skippable and redirectable.** A click during any long animation should jump to the end state. Tally counters and banners should finish on the next click. For friends playing fast, this matters more than any further effect.
- **Instant first response.** Button down state on `pointerdown`, not `click`. In online games, play the local press sound immediately and let server confirmation drive the outcome animation.
- **Spring rule from Apple.** Tap-triggered motion: no overshoot, or very little. Thrown or dragged motion (flicking a chip, dragging a card): overshoot. This keeps bounce meaningful.
- **Physical weight by object.** Following Rauno's playing-card example: cards are light and barely bounce, chips land with a short bounce and a rattle, and a tower block is heavy with hardly any rebound. Each object class gets its own spring and sound, which is a large part of what makes tables feel real.
- **Generated themes.** Linear's three-variable approach applies directly to player colours and seasonal skins. Define themes as base, accent and contrast, and derive everything with `oklch()` and `color-mix()`, both confirmed in Chromium 130. Contrast stays safe automatically.
- **A cheap "character" alternative.** A small poster-style mascot, or seated avatars, with four states (idle blink, watching, delighted, dismayed) on an SVG sprite. Duolingo's lesson is that idle life and reaction to outcome produce personality. Lip-sync is not needed.

### Gaps
- Linear's own material retrieved has no motion guidance. No Discord or Linear engineering post on animation internals was found.
- Arc coverage is limited to a single anecdote, so no claim about its timings can be made.

## Which animated identity features delight in social apps?

### Takeaway
The successful pattern ties identity to a specific place and moment (avatar frame everywhere, full effect only when someone opens the profile), and keeps loud expressive effects scarce and mutable. Bahlou's edge is doing this inside game tables with friends, where a reaction can land on a person and on a real event.

### Cited Findings
- Discord avatar decorations are animated frames that appear wherever the avatar appears, including conversations. Profile effects are large animations covering the profile, played when someone views it — [Discord](https://discord.com/blog/how-to-customize-your-discord-profile)
- Discord nameplates appear behind the display name in server member lists, when hovering in DM lists, and on the user's settings bar. They launched with eight themes, previewable before purchase — [Discord](https://discord.com/blog/nameplates-land-in-the-shop)
- Super Reactions are burst effects on an emoji, limited to five per week for Nitro and two for Basic or Classic, with two to start for everyone. Discord's post does not explain the limits — [Discord](https://discord.com/blog/april-showers-bring-super-cool-nitro-powers)
- Twitch Power-ups (June 2024) let viewers pay Bits to enlarge an emote or add message effects — [Twitch](https://blog.twitch.tv/en/2024/06/12/introducing-power-ups-unleash-special-effects-with-bits). Streamers publicly asked for a way to turn them off ("Having no toggle on this is wild"), and a moderator noted the only lever was setting the price high enough to dissuade people — [Dexerto mirror](https://dexerto.pages.dev/posts/streamers-already-want-to-disable-twitchs-new-power-ups-chat-feature)
- Google Meet reactions float up the side of the screen and "burst" when several are used — [ChannelNews](https://www.channelnews.com.au/google-meet-introduces-emoji-reactions/). Zoom users complain about floating reactions, and they can only be turned off by each user individually — [Zoom Community](https://community.zoom.com/t5/Zoom-Meetings/Help-How-to-stop-EMOJIS-from-FLOATING-AA-meetings-How-are-you/m-p/242032)
- Teams shows reactions over the sender's profile picture or video, rather than free-floating — [Microsoft Support](https://support.microsoft.com/office/a8323a40-3d07-4129-934b-305370a36e21)
- A developer design note for floating reactions proposes per-sender throttling locally, and a `position: fixed; pointer-events: none` overlay — [hero_whiteboard issue](https://forge.ourworld.tf/lhumina_code/hero_whiteboard/issues/98)
- Hearthstone players ask for auto-squelch that persists across matches, which indicates that opponent emotes are a known irritant — [Blizzard forums](https://us.forums.blizzard.com/en/hearthstone/t/bliz-please-code-an-auto-squelch-setting/162846)

### Inferences
Candidates ordered by how distinctive they would be for Bahlou:

1. **Auto-generated victory posters.** After a notable win, compose a poster using the player's colour, name in Big Shoulders, the angled cuts and the actual result ("TOUR 14 · x31"), rendered with canvas. Post it to the chat and allow saving it. This is the feature most specific to Bahlou's visual identity. No social app in this review does it, and it turns a game moment into shared chat culture.
2. **Reactions that land on someone.** Pick a friend's seat and throw an emote along an arc to that seat. On arrival the avatar squashes, with a small sound. Implementation: a pool of about 12 reused DOM nodes in a fixed `pointer-events: none` layer, WAAPI on `transform` only. Throttle locally per sender, merge identical bursts into "×5" (Meet bursts a reaction when several participants use the same one), and let the server cap the room rate.
3. **Personal signature.** Each player owns a three-note motif (derived from a seed or chosen), a colour and a one-word slogan, which appear on their wins. The same motif plays when they sit down, so that friends learn each other's sounds. Audio costs nearly nothing (see below).
4. **Entrance strip.** When someone joins a table, a diagonal strip in their colour cuts across with their name. Skip it on quick rejoin, and queue rather than overlap.
5. **Scarce "big" reactions.** A full-table takeover, limited to a few per day per player, as earned rather than bought. Discord's weekly cap keeps its loudest reaction rare. Here, scarcity protects the effect at no cost to anyone.
6. **Avatars that respond to events.** Avatars at the table briefly wince on PERDU, or cheer on a friend's jackpot. Discord's frame shows that avatar-attached identity travels with the user everywhere.
7. **Nameplates that move only when it matters.** Static in lists, animating on hover or when it is that player's turn. This also protects low-end machines. Long lists of permanently animated names are the opposite of a good performance budget.
8. **Seasonal themes as tokens.** A `data-season` attribute that swaps the base, accent and contrast, and changes the words on wipes and the particle shape. No new animation code is required.
9. **Mute controls from the start.** Per-friend mute of reactions, a global toggle, and persistence across games (the Hearthstone complaint). Zoom's and Twitch's backlash shows what happens when this is missing.

Unlocks should come from play or be gifted between friends rather than bought, and should not depend on time-limited pressure.

### Gaps
- No technical documentation was found on how Discord renders effects, or on how Meet, Zoom and Teams rate-limit reactions.
- Discord's support page on nameplates and reduced motion returned HTTP 403, so behaviour under reduced motion is unconfirmed.
- No solid source on seasonal theme impact was found. That recommendation is design reasoning only.
- No official Blizzard statement on emote or squelch design was found.

## How should performance be handled on low-end Linux machines without GPU?

### Takeaway
Measure, because the usual web advice is only partly right without a GPU. Full-canvas WebGL is the worst offender, while sound is effectively free, so **lite mode should cut shaders and full-root view transitions but keep all audio and most of the timing juice.** Hit stop, pitch ladders and tally counters cost almost nothing and survive lite mode intact.

### Cited Findings
**Local probe: effect cost under software rendering.** Electron 33.2.1 with `app.disableHardwareAcceleration()`, off-screen at 1280×720 and 60 fps target, pinned with `taskset` to two physical cores of an i5-11400H. Each effect was sampled once for 2.4 s. "CPU" is the sum of Electron's `percentCPUUsage` across processes and is only meaningful relatively.

| CPU | FPS | Effect tested |
|---:|---:|---|
| 2.9 | idle | Nothing animating (baseline) |
| 18.5 | 60 | Animated `text-shadow` RGB split on a large title |
| 20.6 | 60 | Full-screen opacity flash |
| 21.0 | 60 | 12 cards animating `left` |
| 21.9 | 60 | Counter updating `textContent` every frame |
| 22.7 | 59 | View transition of one card with root excluded (`view-transition-name: none` on `html`), looped |
| 23.1 | 60 | Full-screen `clip-path` polygon wipe |
| 29.8 | 60 | Animated `filter: blur(8px)` panel, 680×420 |
| 30.0 | 60 | Canvas 2D, 300 particles, half resolution |
| 31.0 | 60 | Three stacked title layers with transforms |
| 32.5 | 60 | 12 cards with `@property` conic foil |
| 33.5 | 60 | Whole-page shake with transform |
| 35.0 | 60 | Canvas 2D, 300 particles, full resolution |
| 38.3 | 60 | 12 cards with `will-change: transform`, moving and rotating |
| 41.2 | 60 | 12 cards with 3D perspective tilt |
| 46.0 | 58 | Panel with `backdrop-filter: blur(10px)` moving |
| 48.5 | 60 | Full-screen `mix-blend-mode: screen` overlay |
| 51.0 | 58 | 12 cards with animated `box-shadow` glow |
| 51.2 | 38 | Full-page view transition, looped continuously |
| 58.7 | 60 | SVG `feTurbulence` displacement on a title |
| 61.0 | 60 | WebGL2 vignette, 640×360 upscaled |
| 90.5 | 41 | WebGL2 vignette, 1280×720 |

Limits: a single sample per effect, a fairly fast CPU, 720p rather than 1080p, and off-screen mode adds a per-frame copy. Tests are not all like-for-like (the `will-change` test also rotates). Older laptops will hit limits sooner, and larger windows cost proportionally more.

**Local probe: raw renderer speed** (median ms per frame, all 12 threads available):

| Workload | With GPU | Software |
|---|---:|---:|
| Simple full-screen shader, 720p | 1.1 | 8.8 |
| Simple full-screen shader, 360p | 0.6 | 3.0 |
| 5-octave noise shader, 720p | 2.8 | 24.9 |
| 5-octave noise shader, 360p | 1.1 | 9.7 |

**Local probe: other results**
- Without GPU, WebGL still works, through `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)...))`. The existing regex in `public/anim.js` matches this string.
- `getContext('webgl2', { failIfMajorPerformanceCaveat: true })` returned `null` in software mode and a context with GPU, making it a clean detection signal.
- Canvas 2D in software: 500 `fillRect` took 0.7 ms, 500 `drawImage` 2.3 ms, 500 `arc` fills 2.1 ms, and 100 `shadowBlur` rects 1.4 ms per frame.
- Web Audio does not depend on the GPU: rendering 2 seconds of 24 sawtooth oscillators with filters took about 60 ms in both modes, about 3% of real time. `AudioContext` was `running` without a user gesture in Electron, with `baseLatency` of 10.7 ms.

**External sources**
- `app.disableHardwareAcceleration()` is the Electron API to use, because `--disable-gpu` passed through `appendSwitch` does not work — [Electron docs commit](https://ayakael.net/mirrors/electron/commit/63c34f3dcf5f1a87a40e7cbf9061f49c1f3a89fa)
- On GPU-less servers, switching from SwiftShader to Mesa llvmpipe via `--use-angle=gl` reduced a 3D page screenshot from about 24 s to about 6 s, and `--disable-gpu` forces SwiftShader back on. This is a server-screenshot case, not an interactive app — [Microlink](https://microlink.io/blog/webgl-without-a-gpu)
- Chromium was replacing SwiftShader with WARP on Windows, with Linux alternatives still being investigated — [blink-dev](https://mail-archive.com/blink-dev@chromium.org/msg14549.html)
- The Compute Pressure API reports `nominal`, `fair`, `serious` and `critical`, with `sampleInterval`, and requires a secure context. The spec requires substantial changes before a transition, so states should not flicker — [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Compute_Pressure_API)
- A browser's main thread can make `requestAnimationFrame`-driven animation lag under load, while CSS or WAAPI animation is more robust — [Emil Kowalski](https://emilkowal.ski/ui/great-animations)

### Inferences
**What the numbers imply**
- "Only animate transform and opacity" remains good advice but is weaker without a GPU, because the compositor is itself running on the CPU. In this test, 12 rotated `will-change` cards cost more than 12 cards animating `left`. Treat this cautiously, since the tests differ, but don't assume `will-change` helps in software mode. Applying it widely may hurt.
- Measured against the app's full effect list, the ones to examine first are whole-page shake, 3D tilt on many cards at once, and any `backdrop-filter`.
- Canvas resolution matters far more for WebGL than for 2D particles. Halving resolution saved little for 2D (35.0 to 30.0), so particle count and overdraw deserve attention there, not resolution.
- Avoid WebGL on software machines entirely. Even a tiny vignette at 360p cost more than SVG displacement, and a static CSS radial gradient gives the same look for free.

**Suggested lite mode policy**

| Keep in lite | Replace in lite | Remove in lite |
|---|---|---|
| All sound and music | Full-root view transition → named element only, or none | Any WebGL or canvas shader |
| Hit stop, anticipation, tally ladders | Animated `box-shadow` glow → opacity of a pre-rendered glow layer | `backdrop-filter` (solid colour is more on-brand anyway) |
| `text-shadow` chromatic hit | 3D tilt → hovered card only, no glare | SVG filters |
| `clip-path` wipes and opacity flashes | Whole-page shake → shake only the table or the banner | `mix-blend-mode` full-screen layers |
| Number counters | Particles → about 1/3 (already done in `fx.js`) | Continuous idle animation on offscreen or list items |

**Detection and control**
- Keep the current combination in `public/anim.js` (renderer string, then under-30 fps sampled over 2 s, then a user toggle). Add `failIfMajorPerformanceCaveat` as a first check that needs no string matching.
- Add a third automatic tier, medium, for slow-but-GPU machines, and use `PressureObserver('cpu')` where available: `serious` downgrades to lite during a session. Wrap it in try/catch, as `observe()` may throw.
- Measure the app during real use with `PerformanceObserver({ type: 'long-animation-frame' })`, available in this runtime. Report the worst frame per game to a debug panel, so regressions are visible.
- Budget by "concurrent expensive effects": at most one Tier 2 effect at a time, with a queue. Two full-screen effects at once is the realistic failure mode on these machines.
- On the desktop app, offer a test of `--use-angle=gl` (llvmpipe) on a friend's GPU-less machine. The Microlink result suggests that it might beat SwiftShader. It is unproven for interactive use and only relevant if WebGL stays in use at all.

**Respect reduced motion separately from lite.** `prefers-reduced-motion` is about the person, and lite is about the machine. The code already separates them (`quiet`/`calm` versus `lite`). Keep sound and non-moving feedback for reduced-motion users, and replace shake with a colour flash at low intensity.

#### Cross-cutting shortlist (ranked by impact for effort)
1. Master audio bus with compressor and ducking (fixes clipping, enables all later audio work).
2. Hit stop plus a single `FX.impact(level)` that scales everything together.
3. Tally ladder with semitone-rising pitch on payouts, and pitch-laddered risk on mines and tower.
4. Motion tiers, with decaying wipes and click-to-skip on every long animation.
5. Spring tokens through `linear()`, and object-specific weight for cards, chips and blocks.
6. Reveal timing derived only from public information (ethics rule and side-channel protection together).
7. Layered adaptive music.
8. Reactions thrown at friends' seats, with per-friend mute.
9. Generated victory posters in chat.
10. Shared-element view transitions from game tile to table.

### Gaps
- No real low-end device was tested. Results come from a 2-core restriction on a modern CPU. A session on a friend's actual machine would be more decisive.
- `backdrop-filter` under software compositing has no documentation that I could find. The figure above is this probe alone.
- The probe measured continuous loops, whereas real effects are short bursts. Burst frame drops were not measured.
- llvmpipe was not compared with SwiftShader on this machine in an interactive scene.
