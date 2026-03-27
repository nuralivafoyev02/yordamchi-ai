import type { ParsedCommand } from '../domain/types';
import { parseCommand } from '../parser';

export interface NluAdapter {
  parse(input: string, options?: Parameters<typeof parseCommand>[1]): ParsedCommand;
}

export class RuleBasedNluAdapter implements NluAdapter {
  parse(input: string, options?: Parameters<typeof parseCommand>[1]): ParsedCommand {
    return parseCommand(input, options);
  }
}
