import type { ClientDashboardBoard, ClientDashboardItem, MondayTask, MondayColumnValue } from "@/types";

/**
 * Converts ClientDashboardItem[] (Record-based column_values) 
 * into MondayTask[] (array-based column_values) so member view components can be reused.
 */
export function clientItemsToTasks(
  items: ClientDashboardItem[],
  board: ClientDashboardBoard
): MondayTask[] {
  return items.map((item) => ({
    id: item.id,
    name: item.name,
    board_id: board.boardId,
    board_name: board.boardName,
    created_at: "",
    updated_at: "",
    monday_account_id: board.monday_account_id,
    account_name: board.account_name,
    column_values: Object.entries(item.column_values).map(([id, cv]): MondayColumnValue => ({
      id,
      title: board.columns.find((c) => c.id === id)?.title || id,
      type: cv.type,
      text: cv.text,
      value: cv.value ?? (cv.label_style ? { label_style: cv.label_style } : null),
    })),
  }));
}
