import type { ParsedCommand } from '@yordamchi/shared';
import type { AppContext } from '../../core/app-context';

export async function logParsedActionSuccess(
  app: AppContext,
  options: {
    parsed: ParsedCommand;
    source: 'callback_confirm' | 'direct_parse' | 'text_confirm';
    userId: string;
  },
) {
  const { parsed, source, userId } = options;

  await app.logService.botLog({
    channelLevel: 'SUCCESS',
    context: {
      confidence: parsed.confidence,
      intent: parsed.intent,
      source,
      text: parsed.normalizedText,
    },
    event: `action_saved_${parsed.intent}`,
    level: 'info',
    message: `Action saved successfully: ${parsed.intent}`,
    userId,
  });
}
