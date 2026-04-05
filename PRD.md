# Content Hub Dashboard — Product Requirements Document
## For: Edo Williams | Built by: Codex

---

## Overview

A mobile-first content calendar and management dashboard for a solo content creator managing LinkedIn posts (3x/week) and Substack newsletters (2x/week). The app replaces the existing static HTML dashboard at the same Vercel deployment.

**Live reference mockup:** https://0xsegfaulted-claw2ui.hf.space/p/syRoxtQGLW

---

## Tech Stack

- **Framework:** Next.js 14+ (App Router)
- **UI:** Tailwind CSS + shadcn/ui components
- **Icons:** Lucide React (NO emojis for UI elements)
- **Charts:** Recharts (or Chart.js via react-chartjs-2)
- **State:** React Context + localStorage for persistence (no backend/database)
- **Deployment:** Vercel (replace existing project)
- **Auth:** None (private URL, no login)
- **Data:** JSON stored in localStorage (exportable/importable)

---

## Design Requirements

### Mobile-First
- **Primary use case is mobile** — design for 375px-428px width first, then scale up
- Bottom tab navigation bar (fixed) with 5 tabs
- Touch-friendly tap targets (min 44px)
- Swipe gestures where appropriate
- No hover-dependent interactions

### Desktop
- Sidebar navigation instead of bottom tabs
- Calendar shows full month grid
- Side panels for editing

### Theme
- **Both dark and light mode** with system preference detection + manual toggle
- Clean, modern aesthetic (Linear/Vercel-inspired)
- Color coding:
  - LinkedIn: `#0077B5` (blue)
  - Substack: `#FF6719` (orange)
  - Post types: Trenches (green), Contrarian (red/amber), Tool Review (purple), Free Roundup (teal), Paid Deep Dive (gold)

---

## Pages / Tabs

### 1. 📅 Calendar (Default/Home)

**Mobile View:**
- Top: Current month/year with left/right arrows to navigate
- Below: Horizontal week strip showing 7 days with dots indicating scheduled content
  - Blue dot = LinkedIn post
  - Orange dot = Substack issue
  - Multiple dots if multiple posts on same day
- Below strip: Agenda list for selected day showing all posts
  - Each post card shows: platform icon, post type badge, title/excerpt, status badge, time
  - Tap to expand/view full post
- Floating "+" button (bottom-right) to create new post

**Desktop View:**
- Full month grid (Google Calendar style)
- Each day cell shows post cards with platform icon + title truncated
- Click day to see details in side panel
- Click post to edit

**Post Statuses:**
- 💡 Idea → ✍️ Draft → 👀 Review → ✅ Approved → 📤 Posted
- Use Lucide icons for each status, with color-coded badges

### 2. 💡 Ideas Bank

**Purpose:** Capture and manage content ideas before they become scheduled posts.

**Mobile View:**
- Searchable list of idea cards
- Each card: priority indicator (colored left border), platform badge, title, description preview, status
- Swipe right to quick-add to calendar
- Tap to expand/edit
- Floating "+" button to add new idea

**Desktop View:**
- Table view with columns: Priority, Platform, Title, Type, Status, Date Added
- Sortable and filterable
- Bulk actions

**Idea Fields:**
- Title (required)
- Description/notes (optional, markdown)
- Platform: LinkedIn / Substack / Both
- Post Type: Trenches / Contrarian / Tool Review / Free Roundup / Paid Deep Dive
- Priority: High (red) / Medium (yellow) / Low (green)
- Status: New / Developing / Ready
- Tags (optional, freeform)

**Key Interactions:**
- "Add to Calendar" button on each idea → opens date/time picker modal
- When added to calendar, idea becomes a scheduled draft
- Edit, delete, reorder by priority
- Drag and drop to reorder (desktop)

### 3. ✍️ Drafts

**Purpose:** Review, edit, and approve content before posting.

**Mobile View:**
- List of draft cards sorted by scheduled date (soonest first)
- Each card shows: platform icon, post type, title, scheduled date, status
- Tap to expand full draft preview
- Action buttons: Approve ✅ / Edit ✏️ / Reject ❌ / Comment 💬

**Desktop View:**
- Split view: list on left, full preview on right
- Markdown editor for editing drafts
- Preview shows approximate LinkedIn/Substack formatting

**Draft Fields:**
- All Idea fields plus:
- Full content (markdown)
- Scheduled date/time
- Approval status: Pending / Approved / Rejected / Needs Revision
- Comments/notes (for feedback like "make this more personal")
- Revision history (keep previous versions)

**Comment/Feedback Flow:**
- When rejecting or requesting revision, require a "why" comment
- Comments stored with the draft for learning purposes
- Display comment thread on each draft

### 4. 📊 Analytics

**Purpose:** Track content performance over time.

**Mobile View:**
- Top stats row (scrollable horizontal): Total Impressions, Avg Impressions, Best Post, Total Comments, Follower Count, Substack Subs
- Line chart: Impressions over time (LinkedIn + Substack on same chart, dual-colored)
- Below: Scrollable list of posts sorted by impressions (best first)
  - Each row: date, platform icon, title, impressions, comments, reposts

**Desktop View:**
- Full stat grid (4 across)
- Larger chart with date range selector
- Full data table with sorting, filtering, search

**Metrics to Track (per post):**
- Impressions
- Comments
- Reposts/Shares
- Reactions/Likes
- Follower change (delta)

**Aggregate Metrics:**
- Total impressions (all time, this month, this week)
- Average impressions per post
- Best performing post
- Posting streak / consistency
- LinkedIn follower count over time
- Substack subscriber count over time
- Posts published this week / target (e.g., 2/3)

**Data Entry:**
- Manual input for now (no LinkedIn API integration yet)
- After posting, user can tap a post and enter its metrics
- Future: API integration for auto-pull

### 5. ⚙️ Settings

- Theme toggle (Light / Dark / System)
- Export data (download all data as JSON)
- Import data (upload JSON to restore)
- Content strategy reference (embedded markdown from strategy doc)
- Posting schedule configuration (which days, which platforms)
- Notification preferences (for future use)

---

## Data Model (localStorage JSON)

```typescript
interface ContentHub {
  ideas: Idea[]
  posts: Post[]
  analytics: AnalyticsEntry[]
  settings: Settings
}

interface Idea {
  id: string // uuid
  title: string
  description?: string
  platform: 'linkedin' | 'substack' | 'both'
  postType: 'trenches' | 'contrarian' | 'tool-review' | 'free-roundup' | 'paid-deep-dive'
  priority: 'high' | 'medium' | 'low'
  status: 'new' | 'developing' | 'ready'
  tags?: string[]
  createdAt: string // ISO
  updatedAt: string // ISO
}

interface Post {
  id: string
  ideaId?: string // linked idea
  title: string
  content: string // markdown
  platform: 'linkedin' | 'substack'
  postType: 'trenches' | 'contrarian' | 'tool-review' | 'free-roundup' | 'paid-deep-dive'
  scheduledAt: string // ISO datetime
  status: 'idea' | 'draft' | 'review' | 'approved' | 'posted'
  approvalStatus?: 'pending' | 'approved' | 'rejected' | 'needs-revision'
  comments: Comment[]
  revisions: Revision[]
  metrics?: PostMetrics
  createdAt: string
  updatedAt: string
}

interface Comment {
  id: string
  text: string
  author: 'edo' | 'zima'
  createdAt: string
}

interface Revision {
  id: string
  content: string
  createdAt: string
}

interface PostMetrics {
  impressions?: number
  comments?: number
  reposts?: number
  reactions?: number
  followerDelta?: number
}

interface AnalyticsEntry {
  date: string // YYYY-MM-DD
  linkedinFollowers?: number
  substackSubscribers?: number
}

interface Settings {
  theme: 'light' | 'dark' | 'system'
  postingSchedule: {
    linkedin: number[] // day of week (0=Sun, 1=Mon...)
    substack: number[]
  }
  notificationsEnabled: boolean
}
```

---

## UI Components Needed

### Shared
- `BottomTabBar` — mobile navigation (Calendar, Ideas, Drafts, Analytics, Settings)
- `Sidebar` — desktop navigation
- `ThemeToggle` — light/dark mode switch
- `PlatformBadge` — LinkedIn (blue) or Substack (orange) chip
- `PostTypeBadge` — colored badge for post type
- `StatusBadge` — status indicator with Lucide icon
- `PriorityIndicator` — colored left border or dot
- `FloatingActionButton` — "+" button for quick creation

### Calendar
- `MonthGrid` — full calendar grid (desktop)
- `WeekStrip` — horizontal scrollable week (mobile)
- `DayAgenda` — list of posts for selected day
- `PostCard` — compact post preview card

### Ideas
- `IdeaCard` — idea with priority, platform, title, actions
- `IdeaForm` — create/edit idea modal/sheet
- `AddToCalendarModal` — date/time picker for scheduling an idea
- `IdeaList` — searchable, sortable list

### Drafts
- `DraftPreview` — full draft content preview
- `DraftEditor` — markdown editor for content
- `ApprovalActions` — approve/edit/reject/comment buttons
- `CommentThread` — list of comments on a draft
- `RevisionHistory` — previous versions

### Analytics
- `StatsRow` — horizontal scrollable stat cards
- `ImpressionsChart` — line chart with LinkedIn + Substack
- `TopPostsTable` — sortable table of best posts
- `MetricsForm` — input form for entering post metrics

---

## Interactions & Flows

### Creating a New Post
1. Tap "+" button → Choose: "New Idea" or "New Post"
2. If "New Idea": opens idea form → saves to Ideas Bank
3. If "New Post": opens post form with date picker → saves to calendar
4. Can also create from Ideas: tap idea → "Add to Calendar" → pick date

### Idea → Calendar Flow
1. In Ideas Bank, tap an idea card
2. Click "Add to Calendar" button (Lucide calendar-plus icon)
3. Date picker modal opens — select date and time
4. Optionally edit title/content
5. Idea becomes a scheduled draft in the calendar
6. Original idea status updates to show it's been scheduled

### Draft Review Flow
1. Drafts tab shows all pending drafts sorted by date
2. Tap a draft to see full preview
3. Actions:
   - **Approve** → status becomes "approved", ready to post
   - **Edit** → opens markdown editor
   - **Reject** → must enter a "why" comment → status becomes "needs-revision"
   - **Comment** → add feedback without changing status
4. After posting, change status to "posted" and enter metrics

### Entering Analytics
1. After posting content, go to post in Calendar or Drafts
2. Mark as "Posted"
3. Enter metrics: impressions, comments, reposts, reactions
4. Data feeds into Analytics tab charts

---

## Seed Data

Pre-populate with sample data so the dashboard doesn't look empty on first load:

### Sample Posts (from Edo's actual LinkedIn data)
```json
[
  {
    "title": "Yann LeCun just raised $1.03 billion to prove LLMs are a dead end",
    "platform": "linkedin",
    "postType": "contrarian",
    "status": "posted",
    "scheduledAt": "2026-03-15T08:00:00-07:00",
    "metrics": { "impressions": 16968, "comments": 9, "reposts": 1, "reactions": 16 }
  },
  {
    "title": "Google principal engineer: Claude Code produced what our team built in a year",
    "platform": "linkedin",
    "postType": "trenches",
    "status": "posted",
    "scheduledAt": "2026-03-22T08:00:00-07:00",
    "metrics": { "impressions": 11486, "comments": 13, "reposts": 2 }
  },
  {
    "title": "AI no-code builders look magical. They're not. They're platforms.",
    "platform": "linkedin",
    "postType": "contrarian",
    "status": "posted",
    "scheduledAt": "2026-03-18T08:00:00-07:00",
    "metrics": { "impressions": 1978, "comments": 5, "reposts": 2 }
  },
  {
    "title": "Engineering jobs are growing (despite AI)",
    "platform": "linkedin",
    "postType": "trenches",
    "status": "posted",
    "scheduledAt": "2026-03-25T08:00:00-07:00",
    "metrics": { "impressions": 1748, "comments": 1, "reposts": 1 }
  },
  {
    "title": "The Slack MCP setup that changed my morning routine",
    "platform": "linkedin",
    "postType": "tool-review",
    "status": "posted",
    "scheduledAt": "2026-03-20T08:00:00-07:00",
    "metrics": { "impressions": 1591, "comments": 0, "reposts": 0 }
  },
  {
    "title": "Anthropic is at it again — switching from ChatGPT to Claude",
    "platform": "linkedin",
    "postType": "tool-review",
    "status": "posted",
    "scheduledAt": "2026-03-28T08:00:00-07:00",
    "metrics": { "impressions": 1533, "comments": 5, "reposts": 0 }
  }
]
```

### Sample Ideas
```json
[
  { "title": "Why 'AI-first' companies are failing", "platform": "linkedin", "postType": "contrarian", "priority": "high", "status": "new" },
  { "title": "My actual Claude Code setup + config", "platform": "substack", "postType": "paid-deep-dive", "priority": "high", "status": "developing" },
  { "title": "Cursor vs Claude Code vs Copilot for teams", "platform": "linkedin", "postType": "tool-review", "priority": "medium", "status": "new" },
  { "title": "How I restructured sprint planning with AI", "platform": "both", "postType": "trenches", "priority": "medium", "status": "new" },
  { "title": "Top 5 AI developments this week", "platform": "substack", "postType": "free-roundup", "priority": "low", "status": "ready" }
]
```

### Analytics Seed
```json
{
  "linkedinFollowers": 13045,
  "substackSubscribers": 14
}
```

---

## Non-Requirements (Out of Scope)

- No LinkedIn API integration (manual metrics entry for now)
- No Substack API integration
- No email sending (notifications handled externally via Discord)
- No user authentication
- No multi-user support
- No backend/database (localStorage only)
- No real posting to platforms (just tracking)

---

## Quality Requirements

- **Performance:** < 1s load time, smooth animations (60fps)
- **Accessibility:** Keyboard navigable, proper ARIA labels, sufficient contrast
- **Responsive:** Works perfectly on iPhone 12-16 sizes (390-430px) AND desktop (1200px+)
- **PWA-ready:** Add manifest.json so it can be added to home screen (optional but nice)
- **Data safety:** localStorage with export/import so nothing is lost

---

## File Structure (Suggested)

```
app/
├── layout.tsx          # Root layout with theme provider
├── page.tsx            # Redirect to /calendar
├── calendar/
│   └── page.tsx        # Calendar view
├── ideas/
│   └── page.tsx        # Ideas bank
├── drafts/
│   └── page.tsx        # Draft review
├── analytics/
│   └── page.tsx        # Analytics dashboard
├── settings/
│   └── page.tsx        # Settings
components/
├── ui/                 # shadcn components
├── calendar/           # Calendar-specific components
├── ideas/              # Ideas-specific components
├── drafts/             # Draft-specific components
├── analytics/          # Analytics components
├── shared/             # Shared components (badges, cards, etc.)
├── navigation/         # Tab bar, sidebar
lib/
├── store.ts            # localStorage data management
├── types.ts            # TypeScript interfaces
├── seed-data.ts        # Sample data
├── utils.ts            # Helpers
```

---

## Deployment

- Deploy to existing Vercel project (ZimsOrg GitHub → Vercel auto-deploy)
- Replace the current static dashboard
- Private URL, no auth needed
