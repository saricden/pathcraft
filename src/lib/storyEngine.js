export const OPENING_NARRATIVE_SYSTEM_PROMPT = `You are the game master of a dark-fantasy adventure called Pathcraft.
Invent and write the OPENING scene of a brand-new adventure, in ONE short,
vivid sentence (second person, "you") that sets a dark-fantasy scene and
hints at a goal or mystery. Reply with ONLY that sentence — no labels, no
options, no extra commentary.

Example reply:
You arrive in Ashvale, a valley town unsettled by strange disappearances.`;

export const NARRATIVE_SYSTEM_PROMPT = `You are the game master of a dark-fantasy adventure called Pathcraft.
Continue the story in ONE short, vivid sentence (second person, "you"),
advancing the plot by a meaningful step — a new place reached, a person
met, information learned, or a turn of events — based on the player's
chosen action. Do not dwell on small physical details; move the story
forward. Reply with ONLY that sentence — no labels, no options, no extra
commentary.

Example reply:
You reach the old mill and find its doors sealed with fresh chains.`;

export const SINGLE_OPTION_SYSTEM_PROMPT = `You are the game master of a dark-fantasy adventure called Pathcraft.
Given the current scene, suggest ONE short possible next action for the
player — a meaningful "macro" choice such as traveling somewhere, seeking
someone out, pursuing a lead, or making a decision. Reply with ONLY that
one action, 3-6 words, nothing else — no numbering, no labels, no ending
punctuation, no extra commentary.

Example reply:
Travel to the mountain pass`;

export const NARRATIVE_MAX_TOKENS = 60;
export const SINGLE_OPTION_MAX_TOKENS = 20;

export const FALLBACK_NARRATIVE = 'The road ahead is uncertain, but you press onward.';

const MAX_CONTEXT_BLOCKS = 3;
const MAX_NARRATIVE_SENTENCES = 2;

const FALLBACK_OPTIONS = ['Continue onward', 'Seek out answers', 'Return to safety'];

export function fallbackOption(index) {
  return FALLBACK_OPTIONS[index] ?? FALLBACK_OPTIONS[FALLBACK_OPTIONS.length - 1];
}

// Each call's history is shaped to match exactly what that call is being
// asked for right now — mixing formats (e.g. showing labeled multi-line
// examples while asking for a single bare sentence) confuses small models,
// which pattern-match hard on recent conversation shape.

function buildNarrativeHistory(blocks) {
  const recent = blocks.slice(-MAX_CONTEXT_BLOCKS);
  const messages = [];
  for (const block of recent) {
    messages.push({ role: 'assistant', content: block.narrative });
    if (block.chosenIndex != null) {
      messages.push({ role: 'user', content: `I chose: "${block.options[block.chosenIndex]}"` });
    }
  }
  return messages;
}

export function buildOpeningNarrativeMessages() {
  return [{ role: 'system', content: OPENING_NARRATIVE_SYSTEM_PROMPT }];
}

export function buildNarrativeMessages(blocks) {
  return [{ role: 'system', content: NARRATIVE_SYSTEM_PROMPT }, ...buildNarrativeHistory(blocks)];
}

// One option per call, each with its own small token budget — this is what
// actually guarantees no single option can balloon and starve the others of
// the shared budget (which is what kept happening when all 3 were asked for
// in one generation, even with explicit length instructions in the prompt).
// History is deliberately flattened into plain descriptive text rather than
// replayed as multi-turn chat — there's no "list of 3" pattern to stay
// consistent with anymore, so a single flat instruction is simpler and more
// reliable for a small model than reconstructing a chat-shaped few-shot set.
export function buildSingleOptionMessages(blocks, sentence, existingOptions) {
  const recentChoices = blocks
    .slice(-MAX_CONTEXT_BLOCKS)
    .filter((block) => block.chosenIndex != null)
    .map((block) => block.options[block.chosenIndex]);

  const lines = [`Current scene: ${sentence}`];
  if (recentChoices.length > 0) {
    lines.push(`Actions the player has already taken: ${recentChoices.join('; ')}.`);
  }
  if (existingOptions.length > 0) {
    lines.push(
      `Actions already suggested for this scene — do not repeat or closely resemble these: ${existingOptions.join('; ')}.`,
    );
  }
  lines.push('Suggest one short next action.');

  return [
    { role: 'system', content: SINGLE_OPTION_SYSTEM_PROMPT },
    { role: 'user', content: lines.join('\n') },
  ];
}

// Lenient — used for the live streaming preview, so text still grows word
// by word as it arrives. Only strips a stray "STORY:"/"OPTION"-style label
// leaking mid-stream; deliberately does not trim to complete sentences,
// since the in-progress text is expected to be mid-sentence most of the
// time.
export function previewNarrative(raw) {
  let text = raw.trim();
  const strayLabelIdx = text.search(/\b(STORY|OPTION\s*\d)\s*:/i);
  if (strayLabelIdx !== -1) text = text.slice(0, strayLabelIdx).trim();
  return text;
}

// Strict — used once generation has actually finished. Always rebuilds from
// complete (punctuated) sentences only. This both caps length AND drops any
// incomplete trailing fragment left when generation hits the token budget
// mid-sentence — otherwise that unfinished, unpunctuated tail would get
// shown to the player as if it were the final text. If nothing complete was
// generated at all, this returns '', which the caller treats the same as a
// failed generation and retries once.
export function cleanNarrative(raw) {
  const text = previewNarrative(raw);
  const sentences = text.match(/[^.!?]+[.!?]+/g);
  return sentences ? sentences.slice(0, MAX_NARRATIVE_SENTENCES).join(' ').replace(/\s+/g, ' ').trim() : '';
}

const LEADING_MARKER_RE = /^\s*(?:OPTION\s*\d+\s*:|[-*•]|\d+[.):])\s*/i;

// Options are short phrases and legitimately have no terminal punctuation
// ("Return to safety"), so completeness can't be judged by "ends with a
// period" the way narrative sentences can. Instead, reject lines whose last
// word is one that would essentially never end a real action — a strong
// signal generation was cut off mid-thought rather than a real short line.
const INCOMPLETE_TRAILING_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'to', 'of', 'in', 'on', 'at', 'for',
  'with', 'from', 'into', 'onto', 'if', 'as', 'so', 'that', 'who', 'which',
  'is', 'was', 'are', 'be', 'been', 'being', 'has', 'have', 'had',
  'seems', 'seem', 'appears', 'appear', 'feels', 'feel', 'looks', 'look',
]);

function looksTruncated(line) {
  if (/[,;:]$/.test(line)) return true;
  const words = line.split(/\s+/);
  const lastWord = words[words.length - 1]?.toLowerCase().replace(/[^a-z']/g, '');
  return INCOMPLETE_TRAILING_WORDS.has(lastWord);
}

// A single option's raw reply may still contain stray extra lines despite
// being asked for one — take only the first line, and reject it if it looks
// truncated or is empty (the caller retries once, then falls back).
export function cleanOption(raw) {
  const line = raw
    .trim()
    .split('\n')[0]
    .replace(LEADING_MARKER_RE, '')
    .replace(/[.!?]+$/, '')
    .trim();
  if (!line || looksTruncated(line)) return '';
  return line;
}
