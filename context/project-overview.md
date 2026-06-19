# Project Overview

## About the Project

Glam AI is a personal AI assistant for a makeup influencer (Sofia Caruso). She talks to it mostly on WhatsApp, the way she'd text a real assistant. A secondary web dashboard exists for when she wants to see everything laid out visually, but WhatsApp is the main door in.

The assistant does six things for her:

1. **Finds trending content** — scans Instagram and YouTube (TikTok added later) for viral makeup videos, posts, and looks she can riff on.
2. **Writes ideas and scripts** — turns a trend or a vibe into a Reel script, caption, or post idea.
3. **Manages her calendar** — reads her Google Calendar and adds events (adding always asks her first).
4. **Watches her Instagram DMs** — filters the noise, flags messages from brands who want to work with her or already do, summarises them, and drafts replies (sending always asks her first).
5. **Drafts contracts** — uses her old contracts and rate cards (stored privately) to draft a new contract as an editable PDF she can tweak and send.
6. **Talks to her on WhatsApp** — every answer above can be delivered as a WhatsApp message. It also sends her a morning briefing on its own.

---

## The Problem It Solves

A working influencer spends hours a day on things that aren't making content: scrolling for trends, sorting brand DMs from fan DMs, juggling a calendar, and rewriting the same contract over and over. Glam AI takes that load off. She tells it what she needs in a WhatsApp message — or it tells her first, in the morning briefing — and it handles the busywork so she can focus on creating.

Think of it like having a sharp assistant who already knows her rates, her past deals, her schedule, and what's trending — and who texts her instead of making her open five apps.

---

## How She Uses It

### Primary — WhatsApp

Everything works over WhatsApp chat. She sends a message like "what's trending this week?" or "draft a contract for the Velour deal" and the assistant replies. No app to open, no dashboard to learn.

### Autonomous — Morning Briefing

Once a day, without being asked, the assistant sends her a WhatsApp briefing that:

- Asks her what the plan for the day is
- Reminds her about unfinished projects (drafts not posted, contracts not sent, DMs not replied to)
- Surfaces anything time-sensitive (an event today, a brand waiting on a reply)

This is the **only** thing the assistant does without her asking. Everything else is on-demand.

### Secondary — Web Dashboard

A React dashboard mirrors the WhatsApp features in a visual layout: AI chat, a trends grid, a scripts library, a calendar view, a filtered DMs list, and a WhatsApp settings panel. The design is already built — see `context/designs/glam-ai.html`. Use it as the source of truth for the dashboard look and feel.

---

## Core Flows

### Trends — Both Scheduled and On-Demand

- **Scheduled:** every morning a job scans Instagram and YouTube for trending makeup content, scores it for relevance to her style, and stores the top results in the database.
- **On-demand:** when she asks "what's trending?" the assistant returns the freshest stored results, and can run a live scan if the stored data is stale.
- TikTok is out of scope until the client gets TikTok API access — leave a clean stub so it slots in later.

### Content Ideas and Scripts

- She gives a trend, a topic, or a vibe.
- The assistant returns a structured Reel script (hook, body, CTA), caption variations, and a hashtag set.
- Outputs are saved to the scripts library so she can find them again.

### Calendar — Read Freely, Add With Permission

- Reading her Google Calendar is automatic (e.g. "what's on today?").
- Adding an event is **proposed first**: the assistant shows her the event it wants to add and waits for a yes before writing it.

### Instagram DMs — Filter, Summarise, Draft

- The assistant pulls recent Instagram DMs.
- It classifies each as **brand inquiry**, **active collab**, or **ignore** (fan mail, spam).
- It shows only the relevant ones, with a short summary and a suggested reply.
- It **never sends a reply on its own** — she approves or edits first.

### Contracts — RAG Over Her Own Documents

- Her rate cards and past contracts are stored privately and indexed for retrieval (RAG).
- When she asks for a new contract, the assistant retrieves her relevant rates and past terms, drafts the new contract grounded in them, and renders an **editable PDF** she can adjust and send.
- The assistant never invents rates or terms — it grounds them in her stored documents.

---

## Pages (Web Dashboard)

```
/                  → Chat (default landing — mirrors WhatsApp)
/trends            → Trending content grid
/scripts           → Saved scripts and ideas
/calendar          → Calendar view + propose-event flow
/dms               → Filtered brand DMs
/contracts         → Contract drafts + downloads
/settings          → WhatsApp briefing settings, connected accounts
```

Sidebar navigation, matching `context/designs/glam-ai.html`.

---

## Features In Scope

- WhatsApp chat as the primary interface (send + receive)
- Daily autonomous morning briefing (plan-for-the-day + unfinished-project reminders)
- Trends agent — Instagram + YouTube, scheduled daily scan + on-demand
- Content agent — Reel scripts, captions, hashtags, saved to library
- Calendar agent — read freely, propose-before-add for new events
- DMs agent — fetch, classify, summarise, draft replies (never auto-send)
- Contracts agent — RAG over rate cards + old contracts, drafts editable PDF
- React web dashboard mirroring all features
- Single-user (Sofia only) — no multi-tenant accounts

---

## Features Out of Scope

- TikTok trends — until the client has TikTok API access (leave a stub)
- Auto-sending Instagram DM replies — always human-approved
- Auto-adding calendar events — always proposed first
- Posting content directly to Instagram/YouTube — assistant drafts only
- Multi-user / team accounts — single user
- Payment or subscription system
- Image or video generation
- Mobile app — WhatsApp is the mobile experience; dashboard is web only

---

## Target User

One person: Sofia, a makeup influencer who lives on her phone, communicates by text, and wants the boring parts of the business handled without opening another app.

---

## Success Criteria

- She can run her whole day from WhatsApp without opening the dashboard
- The morning briefing is genuinely useful — accurate plan prompt, real unfinished-project reminders
- Trends returned actually match her makeup niche, not generic viral content
- DM filtering reliably separates brand messages from fan mail
- Contract drafts use her real rates and past terms — never invented numbers
- Every "write" action (DM reply, calendar add) is approved by her before it happens
- The dashboard visually matches `context/designs/glam-ai.html`
