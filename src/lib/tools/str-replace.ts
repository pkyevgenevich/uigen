import { z } from "zod";
import { VirtualFileSystem } from "@/lib/file-system";

const TextEditorParameters = z.object({
  command: z.enum(["view", "create", "str_replace", "insert", "undo_edit"]),
  path: z.string(),
  file_text: z.string().nullable(),
  insert_line: z.number().nullable(),
  new_str: z.string().nullable(),
  old_str: z.string().nullable(),
  view_range: z.array(z.number()).nullable(),
});

export const buildStrReplaceTool = (fileSystem: VirtualFileSystem) => {
  return {
    id: "str_replace_editor" as const,
    args: {},
    parameters: TextEditorParameters,
    execute: async ({
      command,
      path,
      file_text,
      insert_line,
      new_str,
      old_str,
      view_range,
    }: z.infer<typeof TextEditorParameters>) => {
      switch (command) {
        case "view":
          return fileSystem.viewFile(
            path,
            view_range as [number, number] | undefined
          );

        case "create":
          return fileSystem.createFileWithParents(path, file_text || "");

        case "str_replace":
          return fileSystem.replaceInFile(path, old_str || "", new_str || "");

        case "insert":
          return fileSystem.insertInFile(path, insert_line || 0, new_str || "");

        case "undo_edit":
          return `Error: undo_edit command is not supported in this version. Use str_replace to revert changes.`;
      }
    },
  };
};
