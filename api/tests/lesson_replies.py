"""Synthetic wording replies for testing language plumbing without real LLM calls."""

import json
from copy import deepcopy


def translated_reply(
    lesson: dict[str, object], language: str, title: str | None = None
) -> str:
    """Mark every prose field as rewritten, preserving structure, numbers and answers."""
    rewritten = deepcopy(lesson)
    if language != "en":
        rewritten["title"] = f"{language}: {rewritten['title']}"
        rewritten["goal"] = f"{language}: {rewritten['goal']}"
        for card in rewritten["cards"]:
            card["text"] = f"{language}: {card['text']}"
            card["options"] = {
                key: f"{language}: {text}" for key, text in card["options"].items()
            }
            voice = card["voice"]
            voice["speak_text"] = f"{language}: {voice['speak_text']}"
            voice["spoken_options"] = {
                key: f"{language}: {text}"
                for key, text in voice["spoken_options"].items()
            }
            for key in ("correct_feedback", "incorrect_feedback"):
                if voice[key] is not None:
                    voice[key] = f"{language}: {voice[key]}"
    if title is not None:
        rewritten["title"] = title
    return json.dumps(rewritten)
