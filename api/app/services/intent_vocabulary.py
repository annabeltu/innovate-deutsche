"""Words and phrases the voice-intent matcher understands. Owner: voice teammate (@voice-placeholder).

Each entry is a comma-separated list of synonyms, written naturally (accents,
apostrophes); services/intent.py normalizes them at load time the same way it
normalizes transcripts. Add a synonym here, not in the matcher. NUMBER_WORDS are listed
in order, so a word's position is its value.

FILLERS are words that may surround a command without changing it ("I think B", "next
question please"). Prefix words such as "option" or "number" are fillers too, so
"option b" is filler + letter. Anything that is neither a phrase nor a filler makes the
utterance `unknown`, which keeps open questions from being mistaken for commands.
"""

from app.schemas.shared import Language
from app.schemas.voice import VoiceIntent

PHRASES: dict[Language, dict[VoiceIntent, str]] = {
    Language.EN: {
        VoiceIntent.YES: "yes, yeah, yep, yup, sure, ok, okay, of course, correct, that's right, add it, add, do it",
        VoiceIntent.NO: "no, nope, nah, no thanks, no thank you, not now, cancel, don't",
        VoiceIntent.REPEAT: "repeat, repeat that, again, say again, say it again, say that again, one more time, come again, pardon, i didn't hear, i didn't catch that",
        VoiceIntent.NEXT: "next, next one, continue, go on, go next, move on, forward, go forward",
        VoiceIntent.BACK: "back, go back, previous, previous one, last one, return",
        VoiceIntent.HELP: "help, help me, i need help, what can i say, what do i say",
        VoiceIntent.START: "start, begin, let's start, let's begin, let's go, go, play",
        VoiceIntent.SCAM: "scam, a scam, fraud, a fraud, fake, scammer",
        VoiceIntent.LEGITIMATE: "legit, legitimate, real, safe, genuine, trustworthy, not a scam, not scam, not fake, not a fraud, not fraud",
    },
    Language.ES: {
        VoiceIntent.YES: "sí, claro, claro que sí, de acuerdo, vale, dale, está bien, correcto, por supuesto, agregar, agrégala, añadir, ok, okey",
        VoiceIntent.NO: "no, no gracias, ahora no, nop, cancelar",
        VoiceIntent.REPEAT: "repite, repetir, repita, repítelo, otra vez, de nuevo, no escuché",
        VoiceIntent.NEXT: "siguiente, sigue, seguir, continúa, continuar, adelante, próximo, próxima",
        VoiceIntent.BACK: "atrás, ir atrás, hacia atrás, regresa, regresar, volver, vuelve, anterior",
        VoiceIntent.HELP: "ayuda, ayúdame, necesito ayuda, qué puedo decir",
        VoiceIntent.START: "empezar, empieza, empecemos, comenzar, comienza, comencemos, iniciar, inicia, vamos, vamos a empezar, vamos a comenzar",
        VoiceIntent.SCAM: "estafa, una estafa, fraude, un fraude, falso, engaño, sí es estafa, sí es una estafa",
        VoiceIntent.LEGITIMATE: "legítimo, legítima, real, seguro, segura, verdadero, confiable, no es estafa, no es una estafa, no es fraude, no es un fraude, no es falso",
    },
    Language.SW: {
        VoiceIntent.YES: "ndiyo, ndio, naam, sawa, ee, ongeza, sawa sawa",
        VoiceIntent.NO: "hapana, la, hapana asante, sitaki, si sasa",
        VoiceIntent.REPEAT: "rudia, rudia tena, sema tena, tena, sijasikia",
        VoiceIntent.NEXT: "ijayo, inayofuata, linalofuata, endelea, mbele, nenda mbele, songa mbele",
        VoiceIntent.BACK: "rudi, rudi nyuma, nyuma, iliyopita",
        VoiceIntent.HELP: "msaada, nisaidie, saidia, nahitaji msaada, niseme nini",
        VoiceIntent.START: "anza, anzisha, tuanze, tuanzeni",
        VoiceIntent.SCAM: "utapeli, ulaghai, tapeli, udanganyifu, ni utapeli",
        VoiceIntent.LEGITIMATE: "halali, salama, si utapeli, sio utapeli, si ulaghai, ni ya kweli, si tapeli",
    },
}

LETTER_NAMES: dict[Language, dict[str, str]] = {
    Language.EN: {
        "a": "a, ay",
        "b": "b, bee, be",
        "c": "c, see, sea",
        "d": "d, dee",
    },
    Language.ES: {"a": "a", "b": "b, be", "c": "c, ce", "d": "d, de"},
    Language.SW: {"a": "a", "b": "b, be", "c": "c, ce", "d": "d, de"},
}

NUMBER_WORDS: dict[Language, str] = {
    Language.EN: "zero, one, two, three, four, five, six, seven, eight, nine, ten",
    Language.ES: "cero, uno, dos, tres, cuatro, cinco, seis, siete, ocho, nueve, diez",
    Language.SW: "sifuri, moja, mbili, tatu, nne, tano, sita, saba, nane, tisa, kumi",
}

FILLERS: dict[Language, str] = {
    Language.EN: "i, say, said, think, choose, pick, select, the, answer, my, is, it, it's, that, that's, um, uh, hmm, please, kiko, so, just, option, letter, number, lesson, card, question",
    Language.ES: "yo, digo, dije, creo, que, elijo, escojo, la, el, es, respuesta, mi, por favor, kiko, eh, este, mmm, pues, opción, letra, número, lección, tarjeta, pregunta",
    Language.SW: "ni, nasema, nadhani, nachagua, jibu, langu, tafadhali, kiko, eh, mmm, chaguo, herufi, namba, nambari, somo, kadi, swali",
}
