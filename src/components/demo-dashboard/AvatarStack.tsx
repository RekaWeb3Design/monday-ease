import { getMember } from "@/data/demoData";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function AvatarStack({ assignees }: { assignees: string[] }) {
  return (
    <TooltipProvider>
      <div className="flex items-center">
        {assignees.map((name, i) => {
          const member = getMember(name);
          return (
            <Tooltip key={name}>
              <TooltipTrigger asChild>
                <div
                  className="flex items-center justify-center rounded-full text-white text-[10px] font-bold border-2 border-white cursor-default"
                  style={{
                    width: 28,
                    height: 28,
                    backgroundColor: member?.color ?? "#C4C4C4",
                    marginLeft: i > 0 ? -8 : 0,
                    zIndex: assignees.length - i,
                  }}
                >
                  {member?.initials ?? "?"}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{name}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
