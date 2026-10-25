const fs = require("fs");
const path = require("path");

/*
 * HALIMAW — single-file integrated version
 * Commands: "." ON | ".." OFF | "..." STATUS
 * Normal messages: optional haha reaction + randomized roast reply.
 *
 * All helper systems are kept in this file so no extra module imports are needed.
 */

module.exports.config = {
  name: "halimaw",
  version: "9.0.0-INTEGRATED",
  hasPermission: 0,
  credits: "sinzu / updated",
  description: "Halimaw — reaction commands + randomized banat reply",
  usePrefix: false,
  commandCategory: "Fun",
  usages: ". = ON | .. = OFF | ... = STATUS",
  cooldowns: 5
};

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

const DATA_PATH = path.join(__dirname, "halimaw_config.json");
const NINJA_REACT = "🥷";
const HAHA_REACT = "haha";
const HAHA_EMOJI = "😆";

const BANAT_REPLY_DELAY_MS = 5000;
const BANAT_MAX_HUMAN_DELAY_MS = 12000;
const REPLY_CHANCE = 0.72;
const REPLY_COOLDOWN_MS = 8000;
const MAX_RECENT = 36;
const TTL_MS = 20 * 60 * 1000;
const MAX_BAGS = 200;
const SHORTHAND_CHANCE = 0.35;

// Palitan ng [] kung gusto mong sumagot sa lahat ng message.
const TRIGGER_WORDS = ["halimaw", "banat", "roast", "tanga", "bobo", "sagot"];

const SPEED_PRESETS = Object.freeze({
  fast:   { min: 350, max: 1100, typingPerChar: 7 },
  normal: { min: 800, max: 2600, typingPerChar: 15 },
  slow:   { min: 1400, max: 4200, typingPerChar: 23 }
});

const BANAT_SHORTHANDS = Object.freeze({
  core: [
    ["you are", "u r"], ["your", "ur"], ["you're", "ur"],
    ["because", "cuz"], ["though", "tho"], ["really", "rlly"],
    ["people", "ppl"], ["please", "pls"], ["message", "msg"]
  ],
  casual: [
    ["okay", "ok"], ["right now", "rn"], ["by the way", "btw"],
    ["I don't know", "idk"], ["in my opinion", "imo"],
    ["to be honest", "tbh"], ["as soon as possible", "asap"]
  ],
  reaction: [
    ["what the heck", "wtf"], ["oh my god", "omg"],
    ["laughing out loud", "lol"], ["I can't even", "cant even"]
  ],
  slang: [
    ["no problem", "np"], ["got to go", "gtg"], ["talk to you later", "ttyl"]
  ]
});

/* ------------------------------------------------------------------ */
/* Roasts                                                              */
/* ------------------------------------------------------------------ */

const RAW_ROASTS = [
  "Puro ka yabang, tapos inuulit mo lang din ang nauna mong sinabi. 🤷‍♂️",
  "Nagpalit ka na naman ng topic, pero hindi naman sukatan ng talino ang dami ng salita. 🤖",
  "「Ang dami mong sinasabi sa comments, pero mas maingay ka kaysa malinaw. 📱🤡」",
  "『Ang hilig mong sumingit, pero hindi naman nagiging tama dahil paulit-ulit. 🫠』",
  "Ang bilis mong magbintang, at hindi lahat ng tahimik ay interesado sa sinasabi mo. 🎭",
  "Puro ka opinion, tapos wala namang bagong sinabi. 💸🧠",
  "Nagagalit ka na naman, tapos ikaw rin ang unang napikon. 🧠📉",
  "『Ang galing mong umiwas sa tanong, pero wala pa ring direksyon ang argumento mo. 🧠📉』",
  "Ang sipag mong magpalit ng profile, pero ikaw rin ang nalilito sa sarili mong sinabi. ⚡🗿",
  "Ang ingay mo sa comments, pero hindi sapat ang confidence kung mali ang punto. 🤐",
  "「Ang hilig mong gumawa ng issue, at wala namang nagbago kahit humaba ang chat mo. 💸🧠」",
  "Nagsalita ka na naman, tapos ikaw pa ang galit kapag sinagot. 🎭",
  "Ang lakas mong magmarunong, tapos ikaw rin ang unang napikon. 💬🙄",
  "Kailangan mo talagang may huling salita, pero hindi lahat ng iniisip mo kailangang i-post. 🤡💬",
  "「Puro ka yabang, pero hindi ibig sabihin no’n may alam ka na. 📱🤡」",
  "『Nagagalit ka na naman, tapos kapag tinanong, wala nang kasunod. 💬🙄』",
  "Pati bot hindi mo makausap nang maayos, pero parang ayaw mong intindihin ang sagot. 🎭",
  "Puro ka mema, at hindi lahat ng tahimik ay interesado sa sinasabi mo. 🤷‍♂️",
  "「Puro ka dahilan, at hindi lahat ng tahimik ay interesado sa sinasabi mo. 😴💬」",
  "『Nagpalit ka na naman ng topic, pero wala kang naipakitang patunay. 🗿』",
  "Puro ka puna sa iba, at hindi nadadagdagan ang sense sa dami ng emoji. 💀",
  "Puro ka yabang, pero wala pa ring direksyon ang argumento mo. 🤖",
  "Puro ka yabang, at wala namang nadagdag sa usapan. 🤡💬",
  "『Puro ka opinion, at hindi lahat ng usapan kailangan mong salihan. 🎭』",
  "Ang tapang mo kapag walang nakakakilala, pero wala pa ring direksyon ang argumento mo. 📶😴",
  "Nagpalit ka lang ng pangalan, pero mukhang mas mahalaga sa’yo ang pansin kaysa punto. 🤷‍♂️",
  "Puro ka pa-cool, tapos wala ka namang masagot. 🎭",
  "『Gumawa ka pa talaga ng bagong account, tapos wala ka namang masagot. 🤖』",
  "Puro ka parinig pero walang diretsong sagot, parang hindi mo muna pinag-isipan bago sinend. 🗿",
  "Ang sipag mong magpalit ng profile, at hindi lahat ng usapan kailangan mong salihan. 📱🤡",
  "「Puro ka dahilan, tapos parang ikaw lang ang may ganang ipagpatuloy ’to. 📱🤡」",
  "『Ang dami mong effort sa gulo, tapos kapag tinanong, wala nang kasunod. 🧠📉』",
  "Ang lakas mong magmarunong, at ang layo pa rin ng sagot mo sa tanong. 💬🙄",
  "Ang galing mong umiwas sa tanong, tapos nagtataka kang hindi ka sineseryoso. 📶😴",
  "「Ang hilig mong gumawa ng issue, parang gusto mo lang talagang mapansin. 🧠📉」",
  "『Ang hilig mong sumingit, pero hindi mo kailangang gawing tungkol sa’yo lahat. 💬🙄』",
  "Ang hilig mong sumingit, pero mas maingay ka kaysa malinaw. 💬🙄",
  "Nagagalit ka na naman, pero ikaw rin ang nalilito sa sarili mong sinabi. 💬🙄",
  "「Nagpaliwanag ka pa nang ganyan, at wala namang nagbago kahit humaba ang chat mo. 🫠」",

  // More banat replies
  "Ang haba ng message mo, pero parang intro pa lang hanggang dulo. 😭",
  "Puro ka typing, kulang naman sa point. 💬",
  "Hindi lahat ng may last word, may best argument. 🗿",
  "Ang confident mo, parang may source ka kahit wala. 🤡",
  "Nag-type ka ng essay para sabihin ang wala. 📉",
  "Ang dami mong energy sa debate, sana may direction din. 😭",
  "Puro ka comeback, pero recycled naman. ♻️",
  "Hindi porket caps lock, may bigat na ang sinabi. 📢",
  "Ang bilis mong mag-reply, sana ganoon din kabilis umintindi. 🧠",
  "Nag-iba ka na naman ng topic, naligaw na ba ang argumento? 🗺️",
  "Puro ka confidence, pero nasaan ang evidence? 🔎",
  "Ang lakas ng entrance mo, wala namang plot twist. 🎬",
  "Parang loading screen ang argumento mo, walang dumadating. ⏳",
  "Ang daming notification, wala namang bagong impormasyon. 📱",
  "Hindi ito contest ng haba ng chat, point ang hinahanap. 🎯",
  "Ang dami mong sinabi para hindi masagot ang tanong. 😭",
  "Puro ka reaction, pero walang explanation. 🎭",
  "Kung may medal sa pag-iwas sa topic, may podium ka na. 🏆",
  "Ang layo na ng sagot mo, parang ibang conversation na. 🛣️",
  "May confidence ka nga, pero kailangan pa rin ng context. 🗿",
  "Puro ka side comment, nasaan na ang main point? 💬",
  "Parang trailer ang banat mo, pero walang actual content. 🎥",
  "Ang dami mong edits sa sinabi mo, pero same pa rin ang point. ✍️",
  "Kung puro volume ang basehan, panalo ka na sana. 🔊",
  "Hindi porket ikaw ang huling nag-message, ikaw na ang tama. 📩",
  "Ang daming emoji, kulang sa paliwanag. 🤡",
  "Puro ka 'trust me bro', nasaan ang proof? 🧾",
  "Ang bilis mong mag-assume, parang may subscription ka sa haka-haka. 😭",
  "Nag-demand ka ng respeto pero ayaw mong makinig. 🗿",
  "Ang point mo nag-AFK habang ikaw tuloy-tuloy sa typing. 🎮",
  "Parang group project ang argumento mo, walang may gustong magdala. 📚",
  "Nag-reply ka agad, pero hindi mo yata binasa ang tanong. 👀",
  "Ang dami mong detour, wala pa rin sa destination. 🧭",
  "Hindi lahat ng disagreement ay personal attack. 🧠",
  "Puro ka comeback, pero walang direct answer. 🎯",
  "Ang lakas ng claim, ang hina ng support. 📉",
  "Kung may context ka, ilabas mo; huwag puro teaser. 🎬",
  "Parang draft ang argumento mo, hindi pa ready i-submit. 📝",
  "Puro ka debate mode kahit simpleng tanong lang. 😭",
  "Ang daming side quest, nakalimutan na ang main mission. 🎮",
  "Hindi ko kailangan ng paragraph kung puwedeng isang malinaw na sagot. 💬",
  "Puro ka 'actually', pero wala namang bagong fact. 🗿",
  "Ang bilis mong mag-correct, pero hindi mo muna chine-check. 🔎",
  "Puro ka pressure sa iba, pero hindi mo maipaliwanag ang point mo. 😶",
  "Hindi lahat ng tahimik ay talo; minsan tapos na silang makipagtalo. 🧊",
  "Ang dami mong sinasabi, pero balik tayo sa tanong. 🎯",
  "Puro ka plot twist, pero walang logical connection. 🎞️",
  "Ang confident ng delivery, pero kailangan pa ng supporting details. 📚",
  "Kung may resibo ka, ilabas; kung wala, huwag mag-imbento. 🧾",
  "Ang argumento mo parang Wi-Fi sa malayo—putol-putol ang connection. 📶",
  "Puro ka side-eye, pero walang direct explanation. 👀",
  "Ang dami mong energy sa pagkontra, sana may effort din sa pag-unawa. 🧠",
  "Hindi kailangang manalo sa bawat usapan para may point ka. 🤝",
  "Puro ka last word, pero hindi last word ang basehan ng tama. 🗿",
  "Ang daming caps lock, pero lowercase pa rin ang logic. 🔡",
  "Puro ka 'obvious', pero hindi mo naman naipaliwanag. 😭",
  "Ang daming confidence sa conclusion, kulang naman ang premises. 📉",
  "Hindi sapat ang pagiging maingay para maging convincing. 🔊",
  "Puro ka comeback, pero parang copy-paste lang sa internet. ♻️",
  "Ang dami mong tanong pabalik, pero hindi mo sinagot ang una. 🔄",
  "Puro ka accusations, pero wala namang supporting evidence. 🧾",
  "Ang layo na ng usapan, pero hindi pa rin nasasagot ang original point. 🧭",
  "Kung gusto mong kontrahin, kontrahin ang idea—huwag ang tao. 🧠",
  "Puro ka drama sa comments, pero simple lang naman ang tanong. 🎭",
  "Ang haba ng reply mo, pero kailangan pa ring hulaan ang point. 🕵️",
  "Puro ka 'gets mo ba?', pero ikaw ang hindi sumagot. 😭",
  "Ang daming statement, pero walang malinaw na conclusion. 📝",
  "Hindi lahat ng mabilis mag-type, mabilis umintindi. ⌨️",
  "Puro ka confidence, pero hindi confidence ang citation. 📚",
  "Ang argument mo parang browser na maraming tabs, walang natatapos. 🌐",
  "Puro ka redirect, parang link na hindi nagbubukas. 🔗",
  "Ang daming sinabi, pero balik tayo sa facts. 🔎",
  "Puro ka sarcasm, pero wala namang sagot sa issue. 🎭",
  "Kung may point ka, sabihin nang diretso. Huwag puro paligoy. 🎯",
  "Ang daming detalyeng hindi kailangan, pero wala ang pinaka-importante. 🗂️",
  "Puro ka 'read carefully', pero ikaw yata ang nag-skip. 👓",
  "Ang bilis mong mag-react, pero baka puwedeng mag-isip muna. 🧠",
  "Puro ka argument by volume, hindi by evidence. 🔊",
  "Ang dami mong counterpoint, pero wala sa tanong ang kalahati. 🧩",
  "Hindi kailangan ng personalan para maipaliwanag ang disagreement. 🤝",
  "Puro ka mockery, pero hindi mo na-address ang claim. 🎯",
  "Ang daming side remarks, pero kulang ang actual answer. 💬",
  "Puro ka 'cope', pero wala ka ring counterargument. 🗿",
  "Ang dami mong sinasabi tungkol sa tao, wala tungkol sa punto. 🧠",
  "Kung mali ako, ipakita kung saan—hindi yung puro insulto. 🔎",
  "Puro ka pa-victory lap, hindi pa nga tapos ang usapan. 🏁",
  "Ang dami mong reaction, pero isang malinaw na sagot lang kailangan. 📩",
  "Puro ka grand speech, pero nawawala ang main idea. 🎤",
  "Ang dami mong claims, pili ka muna ng isang mapapatunayan. 🧾",
  "Puro ka 'facts', pero walang source. 📚",
  "Ang bilis mong manghusga, pero mabagal magbasa ng context. 👀",
  "Puro ka sarcasm, pero hindi nito pinapalakas ang argumento. 🎭",
  "Ang dami mong side comments, pero hindi ka pa rin nakakasagot. 💬",
  "Puro ka bait, pero kailangan pa rin ng malinaw na paliwanag. 🎯",
  "Ang dami mong typing indicator, pero wala pa ring point. ⌨️",
  "Hindi mo kailangang i-extend ang usapan kung wala nang bagong sasabihin. 🧊",
  "Puro ka yabang, pero mas okay sana kung may supporting facts. 🧾",
  "Ang dami mong pabalik-balik, parang hindi mo alam ang destination. 🧭",
  "Puro ka banat, pero hindi lahat ng banat ay argument. 🗿",
  "Ang dami mong words, pero clarity ang kulang. ✍️",
  "Puro ka 'end of discussion', pero ikaw pa rin ang nagre-reply. 🔄",
  "Ang dami mong conclusion, pero hindi mo pinakita ang proseso. 🧠",
  "Puro ka insulto, pero hindi nito sinasagot ang tanong. 🎯",
  "Ang dami mong flex, pero hindi naman iyon ang topic. 🏷️",
  "Puro ka defensive, pero puwede namang sagutin nang kalmado. 🧊",
  "Ang dami mong assumptions, pero kulang sa verification. 🔎",
  "Puro ka 'obvious naman', pero explain mo para malinaw. 📚",
  "Ang dami mong reply, pero parang wala kang binasang reply ng iba. 👀",
  "Puro ka distraction, balik sa main point. 🎯",
  "Ang dami mong sinasabi na hindi related, parang nag-open ka ng ibang tab. 🌐",
  "Puro ka confidence, pero kailangan pa ring patunayan ang claim. 🧾",
  "Ang dami mong argument, pero hindi mo kinilala ang counterpoint. 🧠",
  "Puro ka pa-savage, pero simple explanation lang naman ang hinihingi. 😭",
  "Ang dami mong noise, pero nasaan ang signal? 📡",
  "Puro ka reaction, pero hindi mo na-address ang sinabi. 🎭",
  "Ang dami mong sinabi, pero ang tanong ay hindi pa rin nasasagot. 📩",
  "Puro ka 'last reply ko na', pero nandito ka pa rin. 🔄",
  "Ang dami mong rebuttal, pero hindi lahat relevant. 🧩",
  "Puro ka yabang, pero mas convincing sana kung may facts. 🧾",
  "Ang dami mong banat, pero walang direct answer. 🎯",
  "Puro ka mema, pero hindi nito nadadagdagan ang point mo. 🗿",
  "Ang dami mong effort sa reply, sana may effort din sa pag-unawa. 🧠",
  "Puro ka argument, pero walang maayos na conclusion. 📝",
  "Ang dami mong sinabi, pero simple lang ang kailangan: sagot. 🎯",
  "Ang dami mong rebuttal, pero hindi mo nasagot ang pinakaimportanteng tanong. 🎯",
  "Puro ka flex, pero hindi naman iyon ang pinag-uusapan. 🗿",
  "Ang dami mong sinasabi tungkol sa tono, pero paano naman ang mismong punto? 💬",
  "Hindi porket mahaba ang paliwanag, malinaw na agad. 📝",
  "Puro ka hirit, pero kapag seryosong tanong na, tahimik. 🤐",
  "Ang dami mong side quest, balik tayo sa main mission. 🎮",
  "Puro ka 'basahin mo ulit', pero baka ikaw ang kailangang magbasa ulit. 👀",
  "Ang daming palusot, pero simple lang ang hinihingi: linaw. 🔎",
  "Puro ka rebuttal sa bagay na hindi naman sinabi. 🧩",
  "Ang dami mong confidence sa maling interpretation. 📉",
  "Hindi lahat ng hindi sumasang-ayon sa'yo ay kalaban. 🤝",
  "Puro ka personal attack, pero hindi mo natatamaan ang argumento. 🎯",
  "Ang dami mong reply, pero hindi nadadagdagan ang impormasyon. 🔄",
  "Puro ka 'ikaw kasi', pero hindi iyon sagot sa tanong. 🗿",
  "Ang dami mong assumptions, pero nasaan ang actual evidence? 🧾",
  "Puro ka pa-deep, pero simple lang naman ang issue. 🌊",
  "Ang dami mong pinupuna, pero wala kang konkretong alternatibo. 🛠️",
  "Puro ka reaction, pero wala kang explanation. 🎭",
  "Ang dami mong sinasabi na parang hindi mo nabasa ang context. 👓",
  "Hindi mo kailangang manlait para maipagtanggol ang point mo. 🧠",
  "Puro ka 'tapos na tayo', pero ikaw ang bumabalik sa thread. 🔁",
  "Ang dami mong conclusion, pero kulang ang ebidensya. 📚",
  "Puro ka confidence, pero hindi iyon kapalit ng accuracy. 🎯",
  "Ang dami mong sinasabi, pero wala pa ring malinaw na sagot. 💬",
  "Puro ka sarcasm, pero hindi nito binabago ang facts. 🔎",
  "Ang dami mong point, pero alin diyan ang direktang sagot? 🧩",
  "Puro ka parinig, pero mas madali sana kung diretsahan. 📣",
  "Ang dami mong typing, pero parang hindi mo muna inayos ang thought. ⌨️",
  "Puro ka pa-victim, pero hindi pa natin napag-usapan ang claim. 🎭",
  "Ang dami mong binanggit, pero hindi naman relevant sa issue. 🗂️",
  "Puro ka debate mode, kahit simpleng clarification lang. 😭",
  "Ang dami mong sinasabi tungkol sa intensyon, pero sagutin muna ang point. 🎯",
  "Puro ka 'common sense', pero hindi pare-pareho ang context. 🧠",
  "Ang dami mong hirit, pero wala kang naidagdag na bagong idea. ♻️",
  "Puro ka distraction, pero hindi nawawala ang original question. 📌",
  "Ang dami mong pahayag, pero wala kang maayos na halimbawa. 📝",
  "Puro ka pa-savage, pero hindi naman kailangan ng insulto para sumagot. 🗿",
  "Ang dami mong sinasabi, pero parang ikaw rin ang naguguluhan. 🧭",
  "Puro ka 'research ka muna', pero puwede mo ring ibigay ang source. 🔗",
  "Ang dami mong rebuttal, pero hindi mo kinonsider ang buong sinabi. 👀",
  "Puro ka conclusion, pero hindi mo pinakita kung paano ka nakarating doon. 🧠",
  "Ang dami mong side comments, pero wala pa ring direct answer. 🎯",
  "Puro ka 'obvious', pero hindi obvious kung hindi mo ipapaliwanag. 📚",
  "Ang dami mong sinasabi, pero hindi mo naman nililinaw ang misunderstanding. 🧩",
  "Puro ka reply, pero wala nang bagong laman. 🔄",
  "Ang dami mong pinapatunayan, pero hindi iyon ang tanong. 📍",
  "Puro ka pa-quote, pero mas okay kung sariling paliwanag. ✍️",
  "Ang dami mong sinasabi tungkol sa grammar, pero hindi pa rin nasasagot ang idea. 📖",
  "Puro ka confidence, pero mas okay kung may context. 🔎",
  "Ang dami mong hirit, pero ang point parang naiwan sa unang message. 🧳",
  "Puro ka argument, pero kailangan mo ring makinig sa sagot. 👂",
  "Ang dami mong sinabi, pero puwede sanang mas simple at malinaw. 📝",
  "Puro ka counterpoint, pero hindi mo tinukoy kung anong claim ang kinokontra. 🎯",
  "Ang dami mong assumptions, pero tanong muna bago konklusyon. 🧠",
  "Puro ka pa-cool, pero mas okay ang direct at malinaw na usapan. 💬",
  "Ang dami mong sinabi, pero hindi mo naman nasagot ang follow-up. 📩",
  "Puro ka debate, pero minsan kailangan lang aminin kapag hindi sigurado. 🤝",
  "Ang dami mong sinasabi na parang kailangan laging may panalo. 🏁",
  "Puro ka rebuttal, pero hindi lahat ng sagot ay kailangang kontra. 🧩",
  "Ang dami mong pinupunto, pero hindi mo inayos ang pagkakasunod-sunod. 🗂️",
  "Puro ka 'read the room', pero basahin din natin ang actual message. 👀",
  "Ang dami mong banat, pero ang linaw ng sagot ang mas kailangan. 🎯",
  "Puro ka 'end of story', pero hindi pa malinaw ang story. 📖",
  "Ang dami mong reaction, pero isang source lang sana para malinaw. 🔗",
  "Puro ka insulto, pero hindi iyon ebidensya. 🧾",
  "Ang dami mong sinasabi, pero hindi mo pa rin nililinaw ang claim. 🔎",
  "Puro ka 'cope', pero hindi mo pa rin naipapaliwanag ang side mo. 💬",
  "Ang dami mong argument, pero huwag nating kalimutan ang original topic. 📌",
  "Puro ka hula, pero puwedeng magtanong muna. 🧠",
  "Ang dami mong sinasabi tungkol sa iba, pero kulang ang paliwanag sa idea. 🎯",
  "Puro ka 'trust me', pero mas madaling maniwala kung may proof. 🧾",
  "Ang dami mong sinulat, pero hindi mo tinukoy ang pinakaimportanteng punto. 📝",
  "Puro ka 'fact check', pero i-link mo rin ang source. 🔗",
  "Ang dami mong hirit, pero mas maganda kung may laman ang bawat isa. 📚",
  "Puro ka paliwanag sa tono, pero ang claim mismo ang pag-usapan. 💬",
  "Ang dami mong sinasabi, pero hindi mo kinilala ang valid na tanong. 🤔",
  "Puro ka 'learn to read', pero dapat pareho tayong malinaw sa context. 👓",
  "Ang dami mong pinapalawak, pero hindi naman kailangang gawing komplikado. 🧩",
  "Puro ka argument by repetition, pero hindi nagiging totoo ang claim dahil inuulit. 🔁",
  "Ang dami mong sinabi, pero wala kang binigay na konkretong halimbawa. 📌",
  "Puro ka 'everyone knows', pero sino ang source? 🔎",
  "Ang dami mong hirit, pero mas okay kung may respeto sa usapan. 🤝",
  "Puro ka reply sa bawat detalye, pero hindi mo sinagot ang main question. 🎯",
  "Ang dami mong sinabi, pero puwede mong linawin nang hindi nang-iinsulto. 🧠",
  "Puro ka 'you're wrong', pero saan eksakto? 📍",
  "Ang dami mong assumptions, pero hindi pa natin alam ang buong context. 🧩",
  "Puro ka side-taking, pero puwedeng suriin muna ang facts. 🔎",
  "Ang dami mong sinasabi, pero ang simple ng kailangan: direct answer. 💬",
  "Puro ka argumento, pero hindi lahat ng disagreement kailangan ng away. 🧊",
  "Ang dami mong sinulat, pero sana isang malinaw na punto bawat message. 📝",
  "Puro ka pa-lecture, pero hindi mo naman sinagot ang tanong. 🎓",
  "Ang dami mong pinapansin, pero hindi ang mismong issue. 🎯",
  "Puro ka hirit, pero hindi lahat ng hirit ay may point. 🗿",
  "Ang dami mong sinasabi, pero mas okay kung may malinaw na conclusion. 📝",
  "Puro ka 'I already explained', pero baka kailangan lang ng mas malinaw na paliwanag. 💬",
  "Ang dami mong sinasabi tungkol sa debate, pero hindi naman ito paligsahan. 🤝",
  "Puro ka confidence, pero mas maganda kung sinusuportahan ng facts. 📚",
  "Ang dami mong reply, pero wala pa ring sagot sa tanong na nagsimula nito. 🔄",
  "Puro ka distraction, pero nandito pa rin ang original claim. 📌",
  "Ang dami mong sinabi, pero hindi mo naman pinatunayan ang conclusion. 🧾",
  "Puro ka 'I win', pero hindi ikaw ang judge ng sarili mong argument. 🏁",
  "Ang dami mong typing, pero clarity pa rin ang kulang. ⌨️",
  "Puro ka banat, pero mas solid kung may actual na punto. 🎯",
  "Ang dami mong sinabi, pero hindi mo kailangang gawing personal ang disagreement. 🤝",
  "Puro ka argument, pero puwedeng maging mahinahon habang malinaw. 🧊",
  "Ang dami mong pinupuna, pero ano ang mismong sagot mo? 💬",
  "Puro ka confidence, pero ang facts ang dapat magdala ng argumento. 📚",
  "Ang dami mong sinabi, pero isang direct answer lang ang hinihingi. 🎯",
  "Ang argumento mo, paikot-ikot pero walang malinaw na punto. 🎯",
  "Hindi lahat ng mahaba, malalim. Minsan mahaba lang talaga. 📚",
  "May punto ka sana, kaso natabunan ng yabang. 🤡",
  "Kung confidence lang ang basehan, panalo ka na. Kaso usapan ito. 💬",
  "Ang lakas ng delivery, pero nasaan ang supporting details? 📝",
  "Hindi porke ikaw ang huling nag-reply, ikaw na ang tama. ⏳",
  "Mas okay sana kung facts ang dala kaysa puro parinig. 🔎",
  "Ang daming energy, pero kulang sa explanation. ⚡",
  "Hindi debate ang paramihan ng emoji. 😂",
  "May sagot ka sa lahat, pero walang direktang sagot sa tanong. 🎯",
  "Ang bilis mong manghusga, pero ang bagal mong magpaliwanag. 🐢",
  "Puro conclusion, nasaan ang evidence? 🔍",
  "Hindi ako nalito sa argumento mo; wala lang talagang malinaw. 🧩",
  "Mas convincing sana kung hindi puro personal na banat. 💬",
  "Ang ingay ng reply, pero tahimik ang facts. 📉",
  "Hindi lahat ng disagreement ay hate. Minsan hindi lang talaga tugma ang logic. 🧠",
  "May point ka, pero kailangan mo pa itong ayusin. 🛠️",
  "Hindi kailangang manlait para maipagtanggol ang argumento. 🤝",
  "Kung may source ka, ilapag mo. Kung wala, linawin mo muna. 📎",
  "Ang daming claims, pero wala pang napapatunayan. 📋",
  "Hindi sapat ang 'trust me' kapag facts ang pinag-uusapan. 🔎",
  "Ang confident ng sagot, parang hindi binasa ang tanong. 📖",
  "Mas madaling manalo sa argumento kapag ikaw lang ang kausap mo. 🪞",
  "Hindi ko kailangan ng essay; kailangan ko ng malinaw na sagot. ✍️",
  "Ang point ng usapan ay magpaliwanagan, hindi magparamihan ng insulto. 💡",
  "Kung mali ako, itama mo gamit ang facts. Hindi gamit ang caps lock. 🔠",
  "Hindi personalan ang topic, pero ginawa mong personalan. 🎭",
  "May oras ka sa mahabang reply, sana may oras ka rin sa pag-check ng facts. ⏰",
  "Ang daming palamuti ng sagot, pero kulang ang laman. 🎁",
  "Hindi lahat ng tunog matalino ay may sense. 🧠",
  "Kung may counterargument ka, sabihin mo nang diretso. 🎯",
  "Ang layo na ng sagot mo sa original na tanong. 🛣️",
  "Hindi ako naghahanap ng drama; naghahanap ako ng paliwanag. 🔍",
  "Mas okay ang isang malinaw na punto kaysa sampung paikot-ikot. 🧭",
  "Hindi mo kailangang magpanggap na panalo para magkaroon ng punto. 🏁",
  "Ang daming reaction, pero wala pang actual na sagot. 💬",
  "Hindi porke maraming sumang-ayon, automatic nang tama. 📊",
  "Ang argumento ay sinusuri, hindi sinusukat sa lakas ng boses. 🎙️",
  "Kung may mali sa sinabi ko, tukuyin mo kung alin. 📝",
  "Hindi lahat ng maikling sagot ay walang laman; minsan direkta lang. 🎯",
  "Ang daming side comment, pero hindi nasagot ang main question. 📌",
  "Hindi kailangang gawing competition ang simpleng diskusyon. 🤝",
  "Facts muna bago flex. 🔎",
  "Hindi ko minamaliit ang opinyon mo; hinihingi ko lang ang dahilan. 💭",
  "Ang point ay hindi kung sino ang mas maangas, kundi kung ano ang tama. ⚖️",
  "Mas malinaw ang usapan kapag parehong nakikinig. 👂",
  "Hindi sagot ang pag-uulit ng claim nang mas malakas. 🔁",
  "Kung may bagong impormasyon ka, ilabas mo. Kung wala, huwag paikot-ikot. 📚",
  "Hindi ko sinabing wala kang opinyon; tinatanong ko kung ano ang basehan. 🧾",
  "Ang daming salita, pero hindi nagbago ang argumento. 🔄",
  "Hindi kailangan ng personal attack para maging matibay ang punto. 🛡️",
  "Kung gusto mong maintindihan, ipaliwanag mo nang simple. 💡",
  "Ang reply mo ay mahaba, pero ang tanong ay simple lang. 📏",
  "Hindi ko kailangang sumang-ayon para respetuhin ang paliwanag mo. 🤝",
  "May difference ang pagiging direct sa pagiging bastos. 💬",
  "Kung may proof, mas okay kung iyon ang unang ilabas. 📎",
  "Hindi lahat ng disagreement kailangan ng last word. 🏁",
  "Mas kapani-paniwala ang sagot kapag may malinaw na dahilan. 🧠",
  "Hindi ko kailangan ng banat; kailangan ko ng sagot sa punto. 🎯",
  "Ang usapan ay hindi paunahan sa pag-type. ⌨️",
  "Kung gusto mong mag-correct, maging specific. 📝",
  "Mas mabilis matatapos ang diskusyon kapag hindi lumilihis sa topic. 🧭",
  "Ang daming assumptions, pero kulang sa tanong. ❔",
  "Hindi lahat ng confident ay correct, at hindi lahat ng tahimik ay talo. ⚖️",
  "Mas okay ang malinaw na disagreement kaysa pilit na pang-iinsulto. 🤝",
  "Kung hindi mo alam ang sagot, puwedeng sabihin iyon. 📚",
  "Hindi kahinaan ang pag-amin kapag may kailangang itama. 💡",
  "Ang point mo ang pag-usapan natin, hindi ang pagkatao ng isa't isa. 🎯",
  "Hindi sapat ang sarcasm para mapatunayan ang claim. 🎭",
  "Mas madaling maintindihan ang sagot kapag may halimbawa. 🧩",
  "Hindi lahat ng tanong ay challenge; minsan gusto lang ng paglilinaw. ❓",
  "Kung may disagreement, simulan sa mismong claim. 🔍",
  "Ang daming detour, pero hindi pa rin tayo nakakarating sa sagot. 🛣️",
  "Hindi paramihan ng reply ang sukatan ng magandang argumento. 📏",
  "Mas malakas ang facts kaysa sa paulit-ulit na yabang. 📊",
  "Kung malinaw ang punto mo, hindi mo kailangang ulitin nang sampung beses. 🔁",
  "Ang maayos na paliwanag, hindi kailangang may kasamang insulto. 🤝",
  "Balik tayo sa topic; doon natin malalaman kung may punto. 🎯"
];

// Tanggalin ang duplicates at blangko.
const ROASTS = [...new Set(RAW_ROASTS.map(r => r.trim()).filter(Boolean))];

/* ------------------------------------------------------------------ */
/* Persistent on/off state                                             */
/* ------------------------------------------------------------------ */

function loadData() {
  try {
    const raw = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
    return {
      threads: raw && typeof raw.threads === "object" && raw.threads ? raw.threads : {},
      speed: SPEED_PRESETS[raw && raw.speed] ? raw.speed : "normal"
    };
  } catch (e) {
    return { threads: {}, speed: "normal" };
  }
}

const data = loadData();

function saveData() {
  try {
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("[HALIMAW] Save error:", e.message || e);
  }
}

function isEnabled(threadID) {
  return data.threads[String(threadID)] === true;
}

function setEnabled(threadID, value) {
  data.threads[String(threadID)] = value;
  saveData();
}

/* ------------------------------------------------------------------ */
/* Roast picker (shuffle bag + recent history + TTL cleanup)           */
/* ------------------------------------------------------------------ */

const THREAD_STATE = new Map();

function shuffled(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function cleanupStates(now) {
  for (const [id, s] of THREAD_STATE) {
    if (now - s.touched > TTL_MS) THREAD_STATE.delete(id);
  }
  while (THREAD_STATE.size > MAX_BAGS) {
    let oldestId = null;
    let oldest = Infinity;
    for (const [id, s] of THREAD_STATE) {
      if (s.touched < oldest) {
        oldest = s.touched;
        oldestId = id;
      }
    }
    if (oldestId === null) break;
    THREAD_STATE.delete(oldestId);
  }
}

function getState(threadID) {
  const now = Date.now();
  cleanupStates(now);
  const key = String(threadID);
  let state = THREAD_STATE.get(key);
  if (!state) {
    state = { bag: [], recent: [], lastReplyAt: 0, touched: now };
    THREAD_STATE.set(key, state);
  }
  state.touched = now;
  return state;
}

function nextRoast(state) {
  if (state.bag.length === 0) {
    const fresh = ROASTS.filter(r => !state.recent.includes(r));
    state.bag = shuffled(fresh.length ? fresh : ROASTS);
  }
  const roast = state.bag.pop();
  state.recent.push(roast);
  while (state.recent.length > MAX_RECENT) state.recent.shift();
  return roast;
}

/* ------------------------------------------------------------------ */
/* Shorthands + human-like delay                                       */
/* ------------------------------------------------------------------ */

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const SHORTHAND_RULES = Object.values(BANAT_SHORTHANDS)
  .flat()
  .map(([from, to]) => [new RegExp("\\b" + escapeRegex(from) + "\\b", "gi"), to]);

function applyShorthands(text) {
  if (Math.random() > SHORTHAND_CHANCE) return text;
  let out = text;
  for (const [re, to] of SHORTHAND_RULES) out = out.replace(re, to);
  return out;
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function replyDelay(text) {
  const preset = SPEED_PRESETS[data.speed] || SPEED_PRESETS.normal;
  const jitter = randomBetween(preset.min, preset.max);
  const typing = String(text).length * preset.typingPerChar;
  return Math.min(BANAT_MAX_HUMAN_DELAY_MS, BANAT_REPLY_DELAY_MS + jitter + typing);
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const HAHA_REGEX = new RegExp("\\b" + escapeRegex(HAHA_REACT) + "+\\b", "i");

function react(api, emoji, messageID) {
  if (!messageID || typeof api.setMessageReaction !== "function") return;
  api.setMessageReaction(
    emoji,
    messageID,
    err => {
      if (err) console.error("[HALIMAW] Reaction error:", err);
    },
    true
  );
}

function isTriggered(lowerBody) {
  if (!TRIGGER_WORDS.length) return true;
  return TRIGGER_WORDS.some(word => lowerBody.includes(word));
}

/* ------------------------------------------------------------------ */
/* Event handler                                                       */
/* ------------------------------------------------------------------ */

module.exports.handleEvent = async function ({ api, event }) {
  const threadID = event.threadID;
  const messageID = event.messageID;
  const body = String(event.body || "").trim();

  if (!body) return;

  // Ignore the bot's own messages.
  if (
    event.senderID &&
    typeof api.getCurrentUserID === "function" &&
    String(event.senderID) === String(api.getCurrentUserID())
  ) {
    return;
  }

  // ---- Controls: "." ON | ".." OFF | "..." STATUS ----
  if (body === ".") {
    setEnabled(threadID, true);
    react(api, NINJA_REACT, messageID);
    return api.sendMessage("✅ HALIMAW: ON", threadID);
  }

  if (body === "..") {
    setEnabled(threadID, false);
    react(api, NINJA_REACT, messageID);
    return api.sendMessage("⛔ HALIMAW: OFF", threadID);
  }

  if (body === "...") {
    react(api, NINJA_REACT, messageID);
    return api.sendMessage(
      `📊 HALIMAW STATUS: ${isEnabled(threadID) ? "ON" : "OFF"}`,
      threadID
    );
  }

  if (!isEnabled(threadID)) return;

  // ---- Haha reaction ----
  if (HAHA_REGEX.test(body)) react(api, HAHA_EMOJI, messageID);

  // ---- Banat reply ----
  if (!isTriggered(body.toLowerCase())) return;
  if (Math.random() > REPLY_CHANCE) return;

  const state = getState(threadID);
  const now = Date.now();
  if (now - state.lastReplyAt < REPLY_COOLDOWN_MS) return;
  state.lastReplyAt = now;

  const reply = applyShorthands(nextRoast(state));
  await delay(replyDelay(reply));

  // Kung na-OFF habang naghihintay, huwag nang ituloy.
  if (!isEnabled(threadID)) return;

  api.sendMessage(
    { body: reply },
    threadID,
    err => {
      if (err) console.error("[HALIMAW] Send error:", err);
    },
    messageID
  );
};

// Walang prefix command; lahat ay nasa handleEvent.
module.exports.run = async function () {};
