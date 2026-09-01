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

export const OPTIONS_SYSTEM_PROMPT = `You are the game master of a dark-fantasy adventure called Pathcraft.
Given the current scene, list exactly 3 short possible next actions for the
player. Each action should be a meaningful, "macro" choice — travel
somewhere, seek out someone, pursue a lead, make a decision — not a small
physical gesture. Reply with ONLY 3 short lines, one action per line, and
nothing else — no numbering, no labels, no extra commentary.

Example reply:
Travel to the mountain pass
Question the merchant
Return to the village at nightfall

Each action must be distinct from the others and from actions used earlier.`;

export const NARRATIVE_MAX_TOKENS = 60;
export const OPTIONS_MAX_TOKENS = 50;

export const FALLBACK_NARRATIVE = 'The road ahead is uncertain, but you press onward.';

const MAX_CONTEXT_BLOCKS = 3;
const MAX_NARRATIVE_SENTENCES = 2;
const LIST_REQUEST = 'List exactly 3 short possible next actions for this scene.';

const FALLBACK_OPTIONS = ['Continue onward', 'Seek out answers', 'Return to safety'];

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

function buildOptionsHistory(blocks) {
  const recent = blocks.slice(-MAX_CONTEXT_BLOCKS);
  const messages = [];
  for (const block of recent) {
    messages.push({ role: 'assistant', content: block.narrative });
    messages.push({ role: 'user', content: LIST_REQUEST });
    messages.push({ role: 'assistant', content: block.options.join('\n') });
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

export function buildOptionsMessages(blocks, sentence) {
  return [
    { role: 'system', content: OPTIONS_SYSTEM_PROMPT },
    ...buildOptionsHistory(blocks),
    { role: 'assistant', content: sentence },
    { role: 'user', content: LIST_REQUEST },
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

export function extractOptions(raw) {
  return raw
    .split('\n')
    .map((line) => line.replace(LEADING_MARKER_RE, '').trim())
    .filter(Boolean)
    .slice(0, 3);
}

export function padOptions(options) {
  const padded = [...options];
  while (padded.length < 3) padded.push(FALLBACK_OPTIONS[padded.length]);
  return padded;
}
