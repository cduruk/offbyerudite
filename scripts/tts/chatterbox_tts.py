# /// script
# requires-python = ">=3.12"
# dependencies = ["modal"]
# ///
"""
Text-to-Speech generation using Chatterbox TTS on Modal.

Local testing:
    uv run modal run scripts/tts/chatterbox_tts.py
    uv run modal run scripts/tts/chatterbox_tts.py --text "Your text here" --output test.wav

Deploy:
    uv run modal deploy scripts/tts/chatterbox_tts.py
"""

import modal

# Define the Modal image with Chatterbox TTS dependencies
image = modal.Image.debian_slim(python_version="3.12").pip_install(
    "chatterbox-tts==0.1.1"
)

app = modal.App("offbyone-tts", image=image)


@app.cls(gpu="a10g", scaledown_window=300, enable_memory_snapshot=True)
class ChatterboxTTS:
    """Chatterbox TTS model running on Modal with GPU acceleration."""

    @modal.enter()
    def load(self):
        """Load the TTS model on container startup."""
        from chatterbox.tts import ChatterboxTTS

        self.model = ChatterboxTTS.from_pretrained(device="cuda")

    @modal.method()
    def generate(self, text: str) -> bytes:
        """Generate speech from text and return WAV bytes."""
        import io

        import torchaudio as ta

        wav = self.model.generate(text)
        buffer = io.BytesIO()
        ta.save(buffer, wav, self.model.sr, format="wav")
        return buffer.getvalue()


@app.local_entrypoint()
def main(text: str = "Hello, this is a test of the text to speech system.", output: str = "output.wav"):
    """CLI entry point for local testing."""
    print(f"Generating speech for: {text[:50]}...")
    tts = ChatterboxTTS()
    wav_bytes = tts.generate.remote(text)
    with open(output, "wb") as f:
        f.write(wav_bytes)
    print(f"Generated: {output} ({len(wav_bytes)} bytes)")
