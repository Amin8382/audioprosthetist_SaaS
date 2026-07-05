import logging
import re

logger = logging.getLogger(__name__)

class NERPipeline:
    def __init__(self):
        self.nlp = None

    def _load_model(self):
        if self.nlp is None:
            try:
                import spacy
                self.nlp = spacy.load("fr_core_news_sm")
            except Exception as e:
                logger.warning(f"spaCy model not available: {e}")

    def extract_entities(self, text: str) -> dict:
        self._load_model()
        entities = {"persons": [], "organizations": [], "dates": []}

        if self.nlp:
            doc = self.nlp(text[:100000])
            for ent in doc.ents:
                if ent.label_ == "PER":
                    entities["persons"].append(ent.text)
                elif ent.label_ == "ORG":
                    entities["organizations"].append(ent.text)
                elif ent.label_ == "DATE":
                    entities["dates"].append(ent.text)

        return entities
