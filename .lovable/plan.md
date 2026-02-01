

# Add 2-Step Monday.com Connection Flow

## Overview

Update the Integrations page to guide users through a 2-step process for connecting Monday.com: first installing the MondayEase app on their workspace, then authorizing the connection.

---

## Changes Summary

| File | Changes |
|------|---------|
| `src/pages/Integrations.tsx` | Replace single Connect button with 2-step flow cards |

---

## Implementation Details

### Updated Monday.com Section

When **NOT connected**, show two cards in sequence:

**Step 1 Card:**
- Heading: "Step 1: Install MondayEase App"
- Description explaining the install process
- Blue outline button: "Install on Monday.com"
- Opens install URL in new tab
- Small "Skip to Step 2" link below

**Step 2 Card:**
- Heading: "Step 2: Connect Your Account"
- Description explaining authorization
- Blue filled button: "Connect Monday.com"
- Uses existing `connectMonday` function

When **connected**, show the existing connected state (workspace name, connected date, disconnect button).

---

## Visual Layout

### Not Connected State

```text
+------------------------------------------------------------------+
| Integrations                                                      |
| Connect your tools to unlock automation features                  |
+------------------------------------------------------------------+

Connected Services
------------------

+-------------------------------+  +-------------------------------+
| [Monday Logo]                 |  | [Monday Logo]                 |
|                               |  |                               |
| Step 1: Install MondayEase    |  | Step 2: Connect Your Account  |
| App                           |  |                               |
|                               |  | After installing, authorize   |
| First, install the MondayEase |  | MondayEase to access your     |
| app on your Monday.com        |  | boards.                       |
| workspace. This allows us to  |  |                               |
| securely access your boards.  |  | [====Connect Monday.com====]  |
|                               |  |        (blue filled)          |
| [---Install on Monday.com---] |  |                               |
|       (blue outline)          |  |                               |
|                               |  |                               |
| Already installed? Skip to    |  |                               |
| Step 2                        |  |                               |
+-------------------------------+  +-------------------------------+
```

### Connected State (unchanged)

```text
+-------------------------------+
| [Monday Logo]  [Connected ✓]  |
| Monday.com                    |
|                               |
| Connect your Monday.com       |
| account to sync boards...     |
|                               |
| Workspace: My Workspace       |
| Connected: Jan 15, 2025       |
|                               |
| [======Disconnect======]      |
|         (red)                 |
+-------------------------------+
```

---

## Code Changes

### Add Install URL Constant

```typescript
const MONDAY_INSTALL_URL = 'https://auth.monday.com/oauth2/authorize?client_id=6f701c9989acf31a7af8a9c497016ce6&response_type=install';
```

### Install Button Handler

```typescript
const handleInstall = () => {
  window.open(MONDAY_INSTALL_URL, '_blank', 'noopener,noreferrer');
};
```

### Skip to Step 2 Link

Simple scroll or just visual indication - since both cards are visible, clicking will just draw attention to Step 2.

### Conditional Rendering Logic

```typescript
{isConnected ? (
  // Existing connected state card
) : (
  // Two cards side by side: Step 1 and Step 2
)}
```

---

## Card Styling

| Element | Style |
|---------|-------|
| Step 1 Button | `variant="outline"` with blue border (`border-[#0073EA] text-[#0073EA]`) |
| Step 2 Button | Existing blue filled style (`bg-[#0073EA]`) |
| Skip link | `text-sm text-primary hover:underline cursor-pointer` |
| Both cards | Standard Card component, same width |

---

## Technical Notes

- Install URL uses `response_type=install` instead of `response_type=code`
- Install opens in new tab so users can return to Step 2
- Step 2 uses existing `connectMonday()` hook function (direct redirect)
- Both steps visible at once for clarity
- Responsive: cards stack on mobile, side-by-side on larger screens

