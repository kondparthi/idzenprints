"""
English -> Telugu for names and addresses, fully offline.

Aadhaar details are personal data, so nothing here calls an outside
service: a rule-based phonetic converter plus a dictionary of common
names / address words / places. The OCR's own Telugu is deliberately NOT
used — Telugu OCR is unreliable — the English reading is converted instead.

No automatic transliteration of free-form names is perfect (Telugu spelling
of an English-spelled name is ambiguous), so every conversion goes through
three layers, most specific first:

  1. learned corrections  — words an operator fixed before (telugu_corrections
     table; passed in as `corrections`), applied automatically next time
  2. built-in dictionary  — common names, places, address words
  3. phonetic rules       — everything else

`convert_text(...)` returns both the Telugu text and the (english, telugu)
word pairs it produced, which is what lets the app learn from an operator's
edit (see `learn_pairs`).
"""
import re
from typing import Mapping, Optional

# ----------------------------------------------------------------- tables

_INDEP = {"a": "అ", "aa": "ఆ", "i": "ఇ", "ee": "ఈ", "u": "ఉ", "oo": "ఊ", "e": "ఎ", "ae": "ఏ", "ai": "ఐ", "o": "ఒ", "oh": "ఓ", "au": "ఔ"}
_MATRA = {"a": "", "aa": "ా", "i": "ి", "ee": "ీ", "u": "ు", "oo": "ూ", "e": "ె", "ae": "ే", "ai": "ై", "o": "ొ", "oh": "ో", "au": "ౌ"}

_VIRAMA = "్"
_ANUSVARA = "ం"

# Longest first. 'sh' is handled in code (initial శ, otherwise ష).
_CONSONANTS = [
    ("ksh", "క్ష"), ("chh", "ఛ"), ("jn", "జ్ఞ"), ("gn", "జ్ఞ"),
    ("kh", "ఖ"), ("gh", "ఘ"), ("ch", "చ"), ("jh", "ఝ"), ("th", "త"), ("dh", "ధ"),
    ("ph", "ఫ"), ("bh", "భ"), ("sh", "ష"), ("ng", "ంగ"),
    ("k", "క"), ("g", "గ"), ("c", "క"), ("j", "జ"), ("t", "త"), ("d", "ద"),
    ("n", "న"), ("p", "ప"), ("f", "ఫ"), ("b", "బ"), ("m", "మ"), ("y", "య"),
    ("r", "ర"), ("l", "ల"), ("v", "వ"), ("w", "వ"), ("s", "స"), ("h", "హ"),
    ("z", "జ"), ("q", "క"), ("x", "క్స"),
]
_VOWELS = ["aa", "ai", "au", "ee", "ii", "oo", "ou", "ea", "a", "e", "i", "o", "u"]
_VOWEL_ALIASES = {"ii": "ee", "ou": "au", "ea": "ee"}

_STOPS_FOR_ANUSVARA = set("కఖగఘచఛజఝటఠడఢతథదధపఫబభ")

# Letter names, for initials ("M Rangareddy" -> "ఎమ్ రంగారెడ్డి").
_LETTER_NAMES = {
    "a": "ఏ", "b": "బి", "c": "సి", "d": "డి", "e": "ఈ", "f": "ఎఫ్", "g": "జి", "h": "హెచ్", "i": "ఐ",
    "j": "జె", "k": "కే", "l": "ఎల్", "m": "ఎమ్", "n": "ఎన్", "o": "ఓ", "p": "పి", "q": "క్యూ", "r": "ఆర్",
    "s": "ఎస్", "t": "టి", "u": "యు", "v": "వి", "w": "డబ్ల్యూ", "x": "ఎక్స్", "y": "వై", "z": "జెడ్",
}

# Kept exactly as printed on Aadhaar's Telugu side.
_KEEP_AS_IS = {"w/o", "s/o", "d/o", "c/o", "h/o"}
# Labels that exist only on the English side.
_DROP_LABELS = {"po", "dist", "district", "vtc", "subdist", "sub-dist", "lm", "loc", "state", "pc", "pin"}

# fmt: off
_DICT = {
    # relations / titles
    "mr": "శ్రీ", "mrs": "శ్రీమతి", "smt": "శ్రీమతి", "sri": "శ్రీ", "shri": "శ్రీ", "late": "లేట్",
    # common name parts
    "reddy": "రెడ్డి", "rao": "రావు", "naidu": "నాయుడు", "kumar": "కుమార్", "kumari": "కుమారి",
    "devi": "దేవి", "lakshmi": "లక్ష్మి", "laxmi": "లక్ష్మి", "krishna": "కృష్ణ", "krishnaveni": "కృష్ణవేణి",
    "venkata": "వెంకట", "venkat": "వెంకట్", "venkatesh": "వెంకటేష్", "venkateswara": "వెంకటేశ్వర",
    "srinivas": "శ్రీనివాస్", "srinivasa": "శ్రీనివాస", "sri": "శ్రీ", "sree": "శ్రీ", "shree": "శ్రీ",
    "ramesh": "రమేష్", "suresh": "సురేష్", "mahesh": "మహేష్", "naresh": "నరేష్", "ganesh": "గణేష్",
    "rajesh": "రాజేష్", "dinesh": "దినేష్", "satish": "సతీష్", "sathish": "సతీష్", "kishore": "కిషోర్",
    "prasad": "ప్రసాద్", "shankar": "శంకర్", "sankar": "శంకర్", "bhaskar": "భాస్కర్", "sagar": "సాగర్",
    "gopal": "గోపాల్", "gopi": "గోపి", "ravi": "రవి", "raju": "రాజు", "ramu": "రాము", "ram": "రామ్",
    "rama": "రామ", "sita": "సీత", "seetha": "సీత", "sai": "సాయి", "shiva": "శివ", "siva": "శివ",
    "anjali": "అంజలి", "anitha": "అనిత", "anita": "అనిత", "sunitha": "సునీత", "sunita": "సునీత",
    "kavitha": "కవిత", "kavita": "కవిత", "swetha": "శ్వేత", "sweta": "శ్వేత", "jyothi": "జ్యోతి",
    "jyoti": "జ్యోతి", "padma": "పద్మ", "saritha": "సరిత", "sarita": "సరిత", "madhavi": "మాధవి",
    "mallesh": "మల్లేష్", "narayana": "నారాయణ", "narayan": "నారాయణ్", "ramana": "రమణ", "ramanna": "రామన్న",
    "yadav": "యాదవ్", "goud": "గౌడ్", "gowd": "గౌడ్", "chary": "చారి", "sharma": "శర్మ", "shetty": "శెట్టి",
    "mohammed": "మహమ్మద్", "md": "ఎండీ", "mohd": "మహమ్మద్", "begum": "బేగం", "khan": "ఖాన్",
    "lalitha": "లలిత", "lalita": "లలిత", "vijaya": "విజయ", "vijay": "విజయ్", "sudha": "సుధ",
    "sunil": "సునీల్", "anil": "అనిల్", "kiran": "కిరణ్", "arun": "అరుణ్", "swamy": "స్వామి", "swami": "స్వామి",
    "prakash": "ప్రకాష్", "ashok": "అశోక్", "mohan": "మోహన్", "rohit": "రోహిత్", "sandhya": "సంధ్య",
    "malgireddy": "మల్గిరెడ్డి", "jayamma": "జయమ్మ", "rangareddy": "రంగారెడ్డి", "ranga": "రంగ",
    "babu": "బాబు", "rani": "రాణి", "rajani": "రజని", "kalyan": "కళ్యాణ్", "kalyani": "కళ్యాణి", "latha": "లత", "lata": "లత",
    "gandhi": "గాంధీ", "chowk": "చౌక్", "chowrasta": "చౌరస్తా", "centre": "సెంటర్", "center": "సెంటర్",
    "hanamkonda": "హనుమకొండ", "hanumakonda": "హనుమకొండ", "kazipet": "కాజీపేట్", "satyanarayana": "సత్యనారాయణ",
    "sathyanarayana": "సత్యనారాయణ", "narasimha": "నరసింహ", "narsimha": "నర్సింహ", "narsing": "నర్సింగ్",
    "srinu": "శ్రీను", "sreenu": "శ్రీను", "swapna": "స్వప్న", "sirisha": "సిరీష", "ravindra": "రవీంద్ర",
    "mahender": "మహేందర్", "mahendar": "మహేందర్", "rajender": "రాజేందర్", "ravinder": "రవీందర్", "narender": "నరేందర్",
    "surender": "సురేందర్", "yadagiri": "యాదగిరి", "bikshapathi": "భిక్షపతి", "pandu": "పండు", "mallaiah": "మల్లయ్య",
    "mallaiyah": "మల్లయ్య", "yellaiah": "ఎల్లయ్య", "lingaiah": "లింగయ్య", "venkaiah": "వెంకయ్య", "ramulu": "రాములు",
    "anjaneyulu": "ఆంజనేయులు", "narayanamma": "నారాయణమ్మ", "lakshmamma": "లక్ష్మమ్మ", "yadamma": "యాదమ్మ",
    "bhagyalakshmi": "భాగ్యలక్ష్మి", "dhanalakshmi": "ధనలక్ష్మి", "mahalakshmi": "మహాలక్ష్మి", "vijayalakshmi": "విజయలక్ష్మి",
    "bhavani": "భవాని", "durga": "దుర్గ", "parvathi": "పార్వతి", "parvati": "పార్వతి", "sarada": "శారద", "sharada": "శారద",
    "pavan": "పవన్", "pawan": "పవన్", "nagaraju": "నాగరాజు", "nagendra": "నాగేంద్ర", "chandra": "చంద్ర",
    "mallikarjun": "మల్లికార్జున్", "balakrishna": "బాలకృష్ణ", "ramakrishna": "రామకృష్ణ",
    # address words
    "nagar": "నగర్", "colony": "కాలనీ", "road": "రోడ్డు", "rd": "రోడ్డు", "street": "స్ట్రీట్", "st": "స్ట్రీట్",
    "lane": "లేన్", "main": "మెయిన్", "cross": "క్రాస్", "near": "దగ్గర", "behind": "వెనుక", "opp": "ఎదురుగా",
    "opposite": "ఎదురుగా", "apartment": "అపార్ట్మెంట్", "apartments": "అపార్ట్మెంట్స్", "flat": "ఫ్లాట్",
    "floor": "ఫ్లోర్", "house": "ఇల్లు", "hno": "ఇంటి నెం", "door": "డోర్", "no": "నెం", "plot": "ప్లాట్",
    "village": "గ్రామం", "mandal": "మండలం", "town": "టౌన్", "city": "సిటీ", "post": "పోస్ట్",
    "temple": "టెంపుల్", "school": "స్కూల్", "bus": "బస్", "stop": "స్టాప్", "station": "స్టేషన్",
    "market": "మార్కెట్", "bazar": "బజార్", "bazaar": "బజార్", "park": "పార్క్", "gate": "గేట్",
    "layout": "లేఔట్", "enclave": "ఎన్‌క్లేవ్", "residency": "రెసిడెన్సీ", "heights": "హైట్స్", "towers": "టవర్స్",
    "vivek": "వివేక్", "jillelaguda": "జిల్లెల్లగూడ", "meerpet": "మీర్‌పేట్", "pet": "పేట్", "peta": "పేట",
    "guda": "గూడ", "palle": "పల్లె", "palli": "పల్లి", "gudem": "గూడెం", "puram": "పురం", "pur": "పూర్",
    "abad": "ఆబాద్", "bad": "బాద్", "gadda": "గడ్డ", "cheruvu": "చెరువు", "kunta": "కుంట", "konda": "కొండ",
    # states / cities
    "telangana": "తెలంగాణ", "andhra": "ఆంధ్ర", "pradesh": "ప్రదేశ్", "karnataka": "కర్ణాటక",
    "tamilnadu": "తమిళనాడు", "maharashtra": "మహారాష్ట్ర", "kerala": "కేరళ", "odisha": "ఒడిశా",
    "hyderabad": "హైదరాబాద్", "secunderabad": "సికింద్రాబాద్", "warangal": "వరంగల్", "karimnagar": "కరీంనగర్",
    "nizamabad": "నిజామాబాద్", "khammam": "ఖమ్మం", "nalgonda": "నల్గొండ", "mahabubnagar": "మహబూబ్‌నగర్",
    "medak": "మెదక్", "adilabad": "ఆదిలాబాద్", "rangareddi": "రంగారెడ్డి", "vijayawada": "విజయవాడ",
    "visakhapatnam": "విశాఖపట్నం", "vizag": "విశాఖపట్నం", "guntur": "గుంటూరు", "tirupati": "తిరుపతి",
    "kurnool": "కర్నూలు", "nellore": "నెల్లూరు", "kadapa": "కడప", "anantapur": "అనంతపురం",
    "bangalore": "బెంగళూరు", "bengaluru": "బెంగళూరు", "chennai": "చెన్నై", "mumbai": "ముంబై", "delhi": "ఢిల్లీ",
    "india": "ఇండియా", "kphb": "కెపిహెచ్‌బి", "lb": "ఎల్బీ", "ecil": "ఈసీఐఎల్", "uppal": "ఉప్పల్",
    "dilsukhnagar": "దిల్‌సుఖ్‌నగర్", "kukatpally": "కూకట్‌పల్లి", "ameerpet": "అమీర్‌పేట్", "gachibowli": "గచ్చిబౌలి",
    "madhapur": "మాదాపూర్", "kondapur": "కొండాపూర్", "miyapur": "మియాపూర్", "lingampally": "లింగంపల్లి",
    "shamshabad": "శంషాబాద్", "ibrahimpatnam": "ఇబ్రహీంపట్నం", "lbnagar": "ఎల్బీనగర్", "nagole": "నాగోల్",
    "hayathnagar": "హయత్‌నగర్", "saroornagar": "సరూర్‌నగర్", "balapur": "బాలాపూర్", "badangpet": "బడంగ్‌పేట్",
}
# fmt: on

_WORD_RE = re.compile(r"[A-Za-z]+")


# -------------------------------------------------------------- phonetics


def _tokenize(word: str) -> list[tuple[str, str]]:
    """lowercase word -> [("C", telugu_consonant) | ("V", vowel_key)]"""
    tokens: list[tuple[str, str]] = []
    i, n = 0, len(word)
    while i < n:
        matched = False
        for vow in _VOWELS:
            if word.startswith(vow, i):
                tokens.append(("V", _VOWEL_ALIASES.get(vow, vow)))
                i += len(vow)
                matched = True
                break
        if matched:
            continue
        for eng, tel in _CONSONANTS:
            if word.startswith(eng, i):
                if eng == "sh" and i == 0:
                    tel = "శ"
                elif eng == "c" and i + 1 < n and word[i + 1] in "ei":
                    tel = "స"
                # doubled consonant: ddy -> డ్డ, tt -> ట్ట, mm -> మ్మ ...
                if i + len(eng) < n and word.startswith(eng, i + len(eng)) and eng in "kgcjtdnpbmlrsvy":
                    double = tel
                    if eng == "d":
                        double = "డ"
                    elif eng == "t":
                        double = "ట"
                    tokens.append(("C", double))
                    tokens.append(("C", double))
                    i += 2 * len(eng)
                else:
                    tokens.append(("C", tel))
                    i += len(eng)
                matched = True
                break
        if not matched:
            i += 1  # unknown character, skip
    # word-final 'y' after a consonant is the vowel 'i' (Reddy, Murthy, Chary)
    if len(tokens) >= 2 and tokens[-1] == ("C", "య") and tokens[-2][0] == "C" and word.endswith("y"):
        tokens[-1] = ("V", "i")
    # 'd' + 'u' at the very end is Telugu డు (Naidu, Babu is separate)
    if len(tokens) >= 2 and tokens[-1] == ("V", "u") and tokens[-2] == ("C", "ద") and word.endswith("du"):
        tokens[-2] = ("C", "డ")
    return tokens


_LONG_A_AFTER = set("రమగద")  # mid-word open 'a' after r/m/g/d is usually long (Rangareddy, Ramadevi, Anuradha)


def _vowel_for(
    key: str, v_index: int, v_total: int, consonants_after: int, word_final: bool, prev_consonant: str = ""
) -> str:
    """Choose short/long a / e / o from the syllable's position (see module doc)."""
    if key == "a":
        if v_total == 1:
            return "aa" if consonants_after == 1 else "a"  # Ram -> రామ్
        if 0 < v_index < v_total - 1 and consonants_after == 1 and prev_consonant[-1:] in _LONG_A_AFTER:
            return "aa"  # Rangareddy: ra-nga-re -> రంగారెడ్డి
        return "a"
    if key in ("e", "o"):
        long_key = "ae" if key == "e" else "oh"
        if word_final:
            return key
        if consonants_after <= 1:
            return long_key  # Mahesh, Gopal
        return key  # Venkat, Konda
    return key


def _phonetic(word: str) -> str:
    tokens = _tokenize(word.lower())
    if not tokens:
        return word
    v_total = sum(1 for t in tokens if t[0] == "V")
    out: list[str] = []
    v_index = 0
    pending_c = False  # last emitted unit is a bare consonant (no vowel yet)
    for idx, (kind, val) in enumerate(tokens):
        if kind == "C":
            nxt = tokens[idx + 1] if idx + 1 < len(tokens) else None
            # nasal before a stop -> anusvara (Ranga, Anand, Sampath)
            if val in ("న", "మ") and nxt and nxt[0] == "C" and nxt[1][0] in _STOPS_FOR_ANUSVARA and nxt[1] != val:
                out.append(_ANUSVARA)
                pending_c = False
                continue
            if pending_c:
                out.append(_VIRAMA)
            out.append(val)
            pending_c = True
        else:
            consonants_after = 0
            for t in tokens[idx + 1 :]:
                if t[0] == "V":
                    break
                consonants_after += 1
            final = idx == len(tokens) - 1
            prev_c = tokens[idx - 1][1] if idx > 0 and tokens[idx - 1][0] == "C" else ""
            key = _vowel_for(val, v_index, v_total, consonants_after, final, prev_c)
            v_index += 1
            if pending_c:
                out.append(_MATRA[key])
            else:
                out.append(_INDEP[key])
            pending_c = False
    if pending_c:
        out.append(_VIRAMA)  # consonant-final word: రమేష్, రాజ్
    return "".join(out).replace(f"{_ANUSVARA}{_VIRAMA}", _ANUSVARA)


# ----------------------------------------------------------------- public


def _convert_core(core: str, corrections: Mapping[str, str]) -> Optional[str]:
    """One word-ish chunk without surrounding punctuation. None = drop it."""
    low = core.lower()
    if low in corrections:
        return corrections[low]
    low_nodot = low.replace(".", "")
    if low_nodot in ("hno", "dno"):
        return "ఇంటి నెం."
    if low_nodot in corrections:
        return corrections[low_nodot]
    if low in _KEEP_AS_IS:
        return core.upper()
    if low in _DROP_LABELS:
        return None
    # initials: "M", "K.v.", "A.B."
    letters = core.replace(".", "")
    if letters.isalpha() and (len(letters) == 1 or ("." in core and all(len(p) == 1 for p in core.strip(".").split(".")))):
        return ".".join(_LETTER_NAMES[c] for c in letters.lower() if c in _LETTER_NAMES) + ("." if core.endswith(".") and len(letters) > 1 else "")
    if low in _DICT:
        return _DICT[low]
    # pieces of a compound with / or - ("Vivek-Nagar") convert piece by piece
    def repl(m: re.Match) -> str:
        w = m.group(0)
        lw = w.lower()
        if lw in corrections:
            return corrections[lw]
        return _DICT.get(lw) or _phonetic(w)

    return _WORD_RE.sub(repl, core)


def convert_text(text: str, corrections: Optional[Mapping[str, str]] = None) -> tuple[str, list[tuple[str, str]]]:
    """Returns (telugu_text, pairs). `pairs` are the (english_core, telugu_core)
    chunks, in order, for every word that was converted (dropped labels and
    pure numbers/punctuation don't appear)."""
    corrections = {k.lower(): v for k, v in (corrections or {}).items()}
    pairs: list[tuple[str, str]] = []
    out_chunks: list[str] = []
    for chunk in re.split(r"(\s+)", text or ""):
        if not chunk or chunk.isspace():
            out_chunks.append(chunk)
            continue
        m = re.match(r"^([^A-Za-z0-9]*)(.*?)([^A-Za-z0-9]*)$", chunk)
        lead, core, trail = (m.group(1), m.group(2), m.group(3)) if m else ("", chunk, "")
        if not core or not re.search(r"[A-Za-z]", core):
            out_chunks.append(chunk)
            continue
        # "PO:" style label -> drop the label together with its colon
        converted = _convert_core(core, corrections)
        if converted is None:
            continue
        pairs.append((core, converted))
        out_chunks.append(f"{lead}{converted}{trail}")
    result = "".join(out_chunks)
    result = re.sub(r"[ \t]{2,}", " ", result).strip()
    result = re.sub(r"\s+,", ",", result)
    return result, pairs


def learn_pairs(english: str, edited_telugu: str, corrections: Optional[Mapping[str, str]] = None) -> dict[str, str]:
    """What the operator changed, as {english_word_lowercase: telugu_word}.
    Only learns when the edited text has the same number of words as the
    automatic conversion (otherwise the words can't be matched up safely)."""
    _, pairs = convert_text(english, corrections)
    edited_words = [w for w in re.split(r"\s+", (edited_telugu or "").strip()) if w]
    if len(edited_words) != len(pairs):
        return {}
    learned: dict[str, str] = {}
    for (eng, auto), edited in zip(pairs, edited_words):
        edited_core = edited.strip(".,;:")
        auto_core = auto
        if edited_core and edited_core != auto_core:
            if not re.search(r"[A-Za-z]", edited_core):  # only Telugu words are worth learning
                learned[eng.lower()] = edited_core
    return learned
