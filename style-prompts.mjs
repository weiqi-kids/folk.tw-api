// 10 種背景生成風格的可重用 prompt 設定。
// 這裡只描述第 3 層背景的視覺方向；所有生成圖仍必須遵守無文字契約。
export const BACKGROUND_STYLE_PROMPTS = {
  '01-金霧祈福-臺灣廟宇工筆水彩': {
    medium: 'premium watercolor and Chinese gongbi hybrid, authentic southern Taiwanese folk-temple atmosphere, delicate ink contours, controlled fine brush detail, natural paper grain',
    palette: 'warm ivory, honey gold, jade green, deep teal, cinnabar red, restrained antique bronze',
    mood: 'quietly auspicious, warm dawn mist, dignified and devotional, contemporary editorial polish',
  },
  '02-現代宋式文人山水風': {
    medium: 'modern Song-style literati landscape, Southern Song corner composition, restrained ink wash with subtle mineral color, spacious asymmetry, quiet refined editorial illustration',
    palette: 'pale celadon, moon white, tea brown, mist gray, muted indigo and a small amount of old gold',
    mood: 'quiet, contemplative, spacious, poetic, contemporary rather than an antique reproduction',
  },
  '03-臺灣廟宇漆線雕金彩風': {
    medium: 'Taiwanese temple lacquer-line sculpture and gilded painted ornament translated into a polished painterly scene, raised lacquer-like contours, gold-leaf glints and jewel-toned relief detail',
    palette: 'cinnabar red, lacquer black, malachite green, turquoise, warm gold and deep plum',
    mood: 'festive, protective, richly ornamental, tactile and premium, authentic Taiwanese temple craftsmanship',
  },
  '04-敦煌石窟絲路礦彩風': {
    medium: 'an original Silk Road mineral-pigment mural aesthetic inspired by ancient cave painting surfaces, aged plaster texture, simplified contour shapes, flowing cloud ribbons and ornamental rhythm, clearly a new composition',
    palette: 'ochre, cinnabar, malachite green, azurite blue, muted turquoise, sand and antique gold',
    mood: 'mysterious, devotional, sun-warmed, weathered and lyrical',
    guardrails: 'do not depict identifiable Buddhist figures, deity faces, copied historical murals, or religious iconography from another tradition; use landscape, flora, animals and abstract cloud forms only',
  },
  '05-現代民俗木版年畫風': {
    medium: 'modern folk woodblock print, hand-carved contour lines, flat hand-colored shapes, visible paper fibers, slight registration character, bold readable silhouettes and contemporary graphic composition',
    palette: 'vermilion, indigo blue, leaf green, mustard ochre, warm ivory and ink black',
    mood: 'joyful, direct, friendly, festive and handcrafted, with sophisticated modern poster balance',
    guardrails: 'keep the shapes bold and print-like, with no written motifs or fake poster lettering',
  },
  '06-霓虹香火賽博龐克風': {
    medium: 'original Taiwanese temple cyberpunk concept illustration, night rain, wet stone and roof silhouettes, luminous incense vapor, neon cloud-light trails, cinematic atmosphere, high-end game key art',
    palette: 'deep midnight blue, cyan neon, magenta neon, amber incense glow, teal reflections and small cinnabar accents',
    mood: 'mysterious, energetic, urban-sacred, futuristic but still recognizably rooted in Taiwanese temple forms',
    guardrails: 'show technology only through light, vapor, rain and material, never through screens or signage',
  },
  '07-神將英雄原創超級英雄漫畫風': {
    medium: 'original heroic graphic-novel comic illustration, bold ink contour, dynamic perspective, selective halftone shadow, dramatic rim light and poster-grade color blocking, a protective East Asian temple guardian silhouette as an original design',
    palette: 'cobalt blue, vermilion red, warm gold, ink black, ivory and electric cyan highlights',
    mood: 'brave, protective, uplifting, kinetic and dramatic while preserving elegant negative space',
    guardrails: 'create a wholly original guardian silhouette with no resemblance to any existing comic, film, game, or branded character; no costume logo or insignia',
  },
  '08-星象魔法牌原創魔法占卜風': {
    medium: 'original celestial magical illustration with an oracle-card atmosphere, luminous moon, stars, crystal, flowers, layered translucent rings and elegant geometric light motifs, refined fantasy art',
    palette: 'pastel aqua, lilac, midnight blue, pearl white, soft rose and luminous gold',
    mood: 'mysterious, hopeful, tender, graceful and dreamlike, with a calm premium editorial finish',
    guardrails: 'use only original abstract celestial geometry, with no recognizable characters, costumes, franchise symbols, copied card designs, or existing magical mascots',
  },
  '09-黃銅神工東方蒸汽龐克風': {
    medium: 'original Eastern steampunk temple garden, aged brass incense burner, elegant clockwork mechanisms, pipes, gears, mechanical lantern forms, rising steam and painterly concept-art detail',
    palette: 'deep teal, oxblood, antique brass, tobacco brown, cream and small turquoise highlights',
    mood: 'inventive, warm, ceremonial, mechanical yet human and handcrafted',
    guardrails: 'use mechanical forms without dials, numerals, labels or logos',
  },
  '10-琉璃天宮東方彩窗奇幻風': {
    medium: 'original Eastern stained-glass fantasy sanctuary, faceted jewel-tone glass, graceful leaded contour lines, luminous temple garden silhouettes, layered translucent color and radiant light',
    palette: 'ruby, sapphire, amber, teal, amethyst, pearl and warm gold',
    mood: 'radiant, magical, serene, jewel-like and uplifting, with strong crafted-glass texture',
    guardrails: 'use an original Eastern garden and temple silhouette with no words and no iconography from unrelated religious traditions',
  },
};

export const POEM_MOTIFS = {
  1: 'a small traditional Taiwanese temple beneath a rounded mountain, rising auspicious cloud forms and gentle dawn light, prosperous and uplifting',
  25: 'an old plum branch with the first blossoms beside a quiet moonlit courtyard and a small pond, patient recovery and renewal',
  50: 'a balanced temple courtyard with two plain unmarked lanterns, lotus leaves, calm water reflections and two paths meeting, harmony and stability',
  75: 'two mandarin ducks beside a lotus pond and a small arched bridge, gentle flowing water and paired blossoms, tender companionship',
  100: 'rain clearing over a temple garden, a brilliant shaft of golden light, distant mountain, lotus and auspicious clouds, triumphant yet serene',
};

// 未特別指定的籤號使用這組場景輪替，讓 100 張背景仍有可辨識的構圖差異。
// 這些是無文字、無牌面符號的視覺敘事，不把籤詩原文交給影像模型渲染。
export const GENERAL_POEM_MOTIFS = [
  'a stone bridge over a misty stream leading toward a small temple gate, early morning light and quiet forward movement',
  'a pine-covered cliff above a sea of clouds, a distant temple pavilion and a clear opening in the sky, steadfast and elevated',
  'a moonlit plum garden beside a quiet temple veranda, a few new blossoms and a shallow reflective pool, patient renewal',
  'a lotus courtyard with balanced paths, plain lanterns and a calm reflecting basin, harmonious and grounded',
  'rain-washed temple roofs beside a waterfall, clouds beginning to part and warm light returning, recovery after difficulty',
  'a calm river bend with a traditional riverside shrine, a small unmarked wooden boat and reeds, travel and changing fortune',
  'a bamboo valley with a stone bell pavilion, drifting mist and a narrow path upward, discipline and inner cultivation',
  'a peach-blossom terrace around a hillside temple, layered steps and soft spring haze, welcoming opportunity',
  'a sea-facing temple courtyard at sunrise, distant islands, wind-shaped pines and warm reflected light, broad prospects',
  'white cranes near a lotus pond below a quiet temple roof, ripples and open sky, clear intention and graceful progress',
  'an old banyan tree shading a small temple courtyard, incense smoke dissolving into sunlight, shelter and reconciliation',
  'a jade-green pool below a multi-tiered waterfall and a small shrine, crisp air and luminous water, cleansing and release',
  'terraced fields surrounding a hill shrine, irrigation water catching the sky and distant farm paths, steady harvest and effort',
  'an autumn maple garden with stone lanterns and a temple bridge, copper leaves and clear evening air, maturity and reflection',
  'a winter mountain temple in soft frost and pale sunlight, evergreen branches and a warm doorway, endurance and protection',
  'a golden grain garden beside a red-roofed temple, gentle wind moving through the field and low hills beyond, abundance',
  'a coastal cliff shrine beneath a large moon, tide pools, smooth rocks and a safe lantern path, patience and timing',
  'a vermilion bridge crossing a formal temple garden, flowering shrubs, still water and a distant pavilion, connection',
  'a high cloud gate between two mountains with a small temple beyond, sunbeams and winding stone stairs, breakthrough',
  'a quiet night garden with lotus, fireflies, a covered walkway and a softly lit temple hall, sincerity and calm',
];

function fallbackMotif(poemId) {
  const no = Number(String(poemId).split('-').at(-1));
  return GENERAL_POEM_MOTIFS[(Number.isFinite(no) ? no - 1 : 0) % GENERAL_POEM_MOTIFS.length];
}

const UNIVERSAL_CONSTRAINTS = 'absolutely no text, Chinese characters, letters, numbers, calligraphy, seals, logos, watermark, readable marks, banners, plaques, signboards, labels, speech bubbles, captions, card titles, card borders, UI screens, emblems, or symbols resembling writing; plain unmarked lanterns only; no pre-rendered panel, frame, badge, footer, dark strip, or black band; no typography of any kind';

export function buildBackgroundPrompt(styleKey, poemId) {
  const style = BACKGROUND_STYLE_PROMPTS[styleKey];
  const key = typeof poemId === 'object' ? poemId.id : poemId;
  const numericId = Number(String(key).split('-').at(-1));
  const motif = POEM_MOTIFS[numericId] ?? fallbackMotif(key);
  if (!style || !motif) throw new Error(`缺少背景 prompt：${styleKey} / ${poemId}`);
  return `Use case: premium vertical background illustration for a Taiwanese folk-temple blessing card.
Asset type: a polished 2:3 portrait background, intended to receive deterministic Chinese poem typography later.
Primary request: ${motif}.
Style and medium: ${style.medium}.
Color palette: ${style.palette}.
Lighting and mood: ${style.mood}.
Composition and framing: keep the main visual weight on the left and lower middle; leave the entire upper-right third calm, low-detail, and softly textured for a vertical poem text panel; keep the lowest 96 pixels visually natural and readable, with garden, water, stone, mist, or paper texture rather than a graphic footer.
Image quality: clear focal hierarchy, elegant negative space, premium illustrative finish, no generic stock poster.
Hard constraints: ${UNIVERSAL_CONSTRAINTS}.
Style-specific guardrails: ${style.guardrails ?? 'keep the composition original, restrained and free of written ornament'}.`;
}
