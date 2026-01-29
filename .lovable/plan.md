

## Add Disconnect Functionality for Monday.com Integration

### Overview
Add the ability to disconnect the Monday.com integration by deleting the integration record from the database and updating the UI to reflect the disconnected state.

---

### Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/hooks/useDisconnectIntegration.ts` | Create | Hook to handle disconnection logic |
| `src/pages/Integrations.tsx` | Update | Wire up the Disconnect button |

---

### Implementation Details

#### 1. Create `src/hooks/useDisconnectIntegration.ts`

```typescript
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface UseDisconnectIntegrationReturn {
  disconnect: (integrationType: string) => Promise<boolean>;
  isDisconnecting: boolean;
}

export function useDisconnectIntegration(): UseDisconnectIntegrationReturn {
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const disconnect = async (integrationType: string): Promise<boolean> => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to disconnect integrations",
        variant: "destructive",
      });
      return false;
    }

    setIsDisconnecting(true);

    try {
      const { error } = await supabase
        .from("user_integrations")
        .delete()
        .eq("user_id", user.id)
        .eq("integration_type", integrationType);

      if (error) {
        console.error("Error disconnecting integration:", error);
        toast({
          title: "Error",
          description: "Failed to disconnect integration",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Success",
        description: `${integrationType === 'monday' ? 'Monday.com' : integrationType} disconnected successfully`,
      });
      return true;
    } catch (err) {
      console.error("Unexpected error:", err);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsDisconnecting(false);
    }
  };

  return { disconnect, isDisconnecting };
}
```

#### 2. Update `src/pages/Integrations.tsx`

Changes needed:
- Import the new `useDisconnectIntegration` hook
- Use the hook to get `disconnect` and `isDisconnecting`
- Create a handler function that calls disconnect and then refetches
- Replace the disabled Disconnect button with a functional one that shows loading state

Key changes to the button section (lines 114-121):

```tsx
// Before (current disabled button with tooltip):
<Tooltip>
  <TooltipTrigger asChild>
    <Button variant="destructive" className="w-full" disabled>
      Disconnect
    </Button>
  </TooltipTrigger>
  <TooltipContent>Coming soon</TooltipContent>
</Tooltip>

// After (functional button with loading state):
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
  ) : (
    'Disconnect'
  )}
</Button>
```

Handler function to add:
```tsx
const handleDisconnect = async () => {
  const success = await disconnect('monday');
  if (success) {
    refetch();
  }
};
```

---

### Flow Summary

1. User clicks "Disconnect" button
2. Button shows loading spinner with "Disconnecting..." text
3. Hook calls Supabase to delete the integration record
4. On success: toast appears, `refetch()` is called to update UI
5. UI updates to show "Not Connected" badge and "Connect Monday.com" button
6. On error: error toast appears, button returns to normal state

