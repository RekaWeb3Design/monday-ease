

# Redesign Integrations Page: Guided Step-by-Step Flow

## Overview

Replace the current 2-card side-by-side layout with a single card containing a guided vertical step-by-step process for connecting Monday.com.

---

## Current State Analysis

The current implementation (lines 144-208) shows two separate cards side-by-side for Step 1 and Step 2. The new design will:
- Combine both steps into a single card
- Add a checkbox gate between steps
- Disable Step 2 until Step 1 checkbox is checked
- Add "Connect a different account" option when connected

---

## Implementation Changes

| File | Changes |
|------|---------|
| `src/pages/Integrations.tsx` | Complete redesign of Monday.com section |

---

## New Component Structure

### Add Import

```typescript
import { useState } from "react"; // Add useState to existing useEffect import
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
```

### Add State

```typescript
const [installComplete, setInstallComplete] = useState(false);
```

---

## Visual Design

### State 1: Not Connected

```text
+----------------------------------------------------------+
| [Monday Logo]                                             |
|                                                           |
| Monday.com Integration                                    |
| Connect your Monday.com workspace to MondayEase           |
|                                                           |
| --------------------------------------------------------- |
|                                                           |
|  (1)  Step 1: Install MondayEase App                     |
|       Install the MondayEase app on your Monday.com       |
|       workspace to allow secure access to your boards.    |
|                                                           |
|       [--- Install on Monday.com ---]  (blue outline)     |
|                                                           |
|       [x] I have completed the installation               |
|                                                           |
| --------------------------------------------------------- |
|                                                           |
|  (2)  Step 2: Connect Your Account           [DISABLED]   |
|       Authorize MondayEase to access your                 |
|       Monday.com boards.                                  |
|                                                           |
|       [====Connect Monday.com====]  (disabled/grayed)     |
|                                                           |
+----------------------------------------------------------+

When checkbox is checked:

+----------------------------------------------------------+
|  (2)  Step 2: Connect Your Account           [ENABLED]    |
|       Authorize MondayEase to access your                 |
|       Monday.com boards.                                  |
|                                                           |
|       [====Connect Monday.com====]  (blue filled)         |
+----------------------------------------------------------+
```

### State 2: Connected

```text
+----------------------------------------------------------+
| [Monday Logo]              [Connected ✓] (green badge)    |
|                                                           |
| Monday.com                                                |
| Your workspace is connected to MondayEase                 |
|                                                           |
| Workspace: My Workspace                                   |
| Connected: Jan 15, 2025                                   |
|                                                           |
| [========Disconnect========]  (red button)                |
|                                                           |
| --------------------------------------------------------- |
|                                                           |
| Connect a different Monday.com account  (text link)       |
|                                                           |
+----------------------------------------------------------+
```

---

## Code Implementation

### Step Badge Component

```typescript
function StepBadge({ step, disabled }: { step: number; disabled?: boolean }) {
  return (
    <div className={`
      flex items-center justify-center w-6 h-6 rounded-full text-sm font-semibold
      ${disabled 
        ? 'bg-muted text-muted-foreground' 
        : 'bg-[#0073EA] text-white'}
    `}>
      {step}
    </div>
  );
}
```

### Not Connected State JSX

```typescript
<Card className="max-w-2xl">
  <CardHeader className="flex flex-row items-start gap-4 space-y-0">
    <img src={mondayLogo} alt="Monday.com" className="h-12 w-12 shrink-0 object-contain" />
    <div className="flex-1 space-y-1">
      <CardTitle>Monday.com Integration</CardTitle>
      <CardDescription>
        Connect your Monday.com workspace to MondayEase
      </CardDescription>
    </div>
  </CardHeader>
  <CardContent className="space-y-6">
    {/* Step 1 */}
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <StepBadge step={1} />
        <div className="flex-1 space-y-2">
          <h3 className="font-semibold">Step 1: Install MondayEase App</h3>
          <p className="text-sm text-muted-foreground">
            Install the MondayEase app on your Monday.com workspace to allow secure access to your boards.
          </p>
          <Button
            variant="outline"
            className="border-[#0073EA] text-[#0073EA] hover:bg-[#0073EA]/10"
            onClick={() => window.open('...install URL...', '_blank')}
          >
            Install on Monday.com
          </Button>
          <div className="flex items-center gap-2 pt-2">
            <Checkbox 
              id="install-complete" 
              checked={installComplete}
              onCheckedChange={(checked) => setInstallComplete(checked === true)}
            />
            <label 
              htmlFor="install-complete" 
              className="text-sm cursor-pointer"
            >
              I have completed the installation
            </label>
          </div>
        </div>
      </div>
    </div>

    <Separator />

    {/* Step 2 */}
    <div className={`space-y-4 transition-all duration-300 ${!installComplete ? 'opacity-50' : ''}`}>
      <div className="flex items-start gap-3">
        <StepBadge step={2} disabled={!installComplete} />
        <div className="flex-1 space-y-2">
          <h3 className="font-semibold">Step 2: Connect Your Account</h3>
          <p className="text-sm text-muted-foreground">
            Authorize MondayEase to access your Monday.com boards.
          </p>
          <Button
            onClick={connectMonday}
            disabled={!installComplete || isConnecting}
            className="bg-[#0073EA] hover:bg-[#0060c2] text-white disabled:opacity-50"
          >
            {isConnecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              'Connect Monday.com'
            )}
          </Button>
        </div>
      </div>
    </div>
  </CardContent>
</Card>
```

### Connected State JSX

```typescript
<Card className="max-w-2xl">
  <CardHeader className="flex flex-row items-start gap-4 space-y-0">
    <img src={mondayLogo} alt="Monday.com" className="h-12 w-12 shrink-0 object-contain" />
    <div className="flex-1 space-y-1">
      <div className="flex items-center justify-between">
        <CardTitle>Monday.com</CardTitle>
        <Badge className="bg-primary text-primary-foreground">Connected</Badge>
      </div>
      <CardDescription>
        Your workspace is connected to MondayEase
      </CardDescription>
    </div>
  </CardHeader>
  <CardContent className="space-y-4">
    {integration?.workspace_name && (
      <p className="text-sm text-muted-foreground">
        <span className="font-medium">Workspace:</span> {integration.workspace_name}
      </p>
    )}
    {formattedDate && (
      <p className="text-sm text-muted-foreground">
        <span className="font-medium">Connected:</span> {formattedDate}
      </p>
    )}
    <Button 
      variant="destructive" 
      className="w-full" 
      onClick={handleDisconnect}
      disabled={isDisconnecting}
    >
      {isDisconnecting ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Disconnecting...
        </>
      ) : 'Disconnect'}
    </Button>
    
    <Separator />
    
    <button
      type="button"
      className="text-sm text-muted-foreground hover:text-primary hover:underline transition-colors w-full text-center"
      onClick={handleSwitchAccount}
    >
      Connect a different Monday.com account
    </button>
  </CardContent>
</Card>
```

### Switch Account Handler

```typescript
const handleSwitchAccount = async () => {
  const success = await disconnect('monday');
  if (success) {
    setInstallComplete(false); // Reset checkbox
    refetch();
  }
};
```

---

## Key Technical Details

| Feature | Implementation |
|---------|----------------|
| Checkbox state | Local `useState`, resets on page refresh |
| Step 2 disabled style | `opacity-50` + `pointer-events-none` on button |
| Enable animation | `transition-all duration-300` on Step 2 container |
| Step badge | Inline component with conditional styling |
| Switch account | Disconnect first, then reset `installComplete` to false |
| Card width | `max-w-2xl` to prevent full-width stretch |

---

## Files Unchanged

- Coming Soon cards for Slack and Notion remain as-is
- Page header remains as-is
- All hooks (`useIntegration`, `useMondayOAuth`, `useDisconnectIntegration`) remain unchanged
- URL params handling for OAuth callback remains unchanged

