import type { FileTree } from "../standard/file-tree";
import type { Finding } from "../standard/finding";

export interface ValidatorOptions {
  forbiddenMentions: readonly string[];
  today: string;
}

export type Validator = (tree: FileTree, options: ValidatorOptions) => Finding[];
