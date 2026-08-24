import os
import sys
import argparse

# Automatically accept non-commercial CPML terms for automated headless execution
os.environ["COQUI_TOS_AGREED"] = "1"

def clone_voice(text, speaker_wav, output_file, language="en"):
    """
    Synthesizes speech in the voice of `speaker_wav` using Coqui XTTS-v2.
    """
    try:
        import torch
        import transformers.pytorch_utils
        if not hasattr(transformers.pytorch_utils, 'isin_mps_friendly'):
            transformers.pytorch_utils.isin_mps_friendly = getattr(torch, 'isin', None)
        from TTS.api import TTS
    except ImportError as e:
        print(f"[ERROR] Required Python packages not found or incompatible: {e}", file=sys.stderr)
        sys.exit(2)

    if not os.path.exists(speaker_wav):
        print(f"[ERROR] Speaker audio file not found: {speaker_wav}", file=sys.stderr)
        sys.exit(3)

    # Ensure output directory exists
    output_dir = os.path.dirname(output_file)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir, exist_ok=True)

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"[*] Initializing XTTS-v2 on device: {device}...")

    # Load XTTS-v2 model (cached automatically in cache folder)
    tts = TTS(model_name="tts_models/multilingual/multi-dataset/xtts_v2").to(device)

    print(f"[*] Cloning voice from: {speaker_wav}")
    print(f"[*] Synthesizing text ({language}): {text[:50]}...")

    # Generate synthesized speech
    tts.tts_to_file(
        text=text,
        speaker_wav=speaker_wav,
        language=language,
        file_path=output_file
    )

    if os.path.exists(output_file):
        print(f"[SUCCESS] Cloned audio saved to: {output_file}")
        sys.exit(0)
    else:
        print("[ERROR] Audio generation completed but output file was not created.", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="XTTS-v2 Voice Cloning Worker for Node.js")
    parser.add_argument("--text", required=True, help="Text to speak")
    parser.add_argument("--speaker_wav", required=True, help="Path to reference speaker sample audio")
    parser.add_argument("--output_file", required=True, help="Path to save synthesized audio output")
    parser.add_argument("--lang", default="en", help="Language code (en, es, fr, de, it, pt, pl, tr, ru, nl, cs, ar, zh, ja, hu, ko, hi)")

    args = parser.parse_args()
    clone_voice(args.text, args.speaker_wav, args.output_file, args.lang)
