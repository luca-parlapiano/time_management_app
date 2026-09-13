"""Run Qwen3-4B locally against a JSONL evaluation set.

The input records must contain `id` and `input`. Each result contains the model's
raw reply, parsed JSON when available, and generation latency in milliseconds.
"""

from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig


ROOT = Path(__file__).resolve().parent.parent
DEFAULT_MODEL = "Qwen/Qwen3-4B"
DEFAULT_PROMPT = ROOT / "prompts" / "planning-intent.txt"
DEFAULT_INPUT = ROOT / "data" / "test.jsonl"
DEFAULT_OUTPUT = ROOT / "results" / "model-output.jsonl"


def read_records(path: Path) -> list[dict]:
    records = []
    for line_number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        if not line.strip():
            continue
        record = json.loads(line)
        if not isinstance(record.get("id"), str) or not isinstance(record.get("input"), str):
            raise ValueError(f"{path}:{line_number} must contain string id and input")
        records.append(record)
    return records


def parse_json(reply: str) -> dict | None:
    candidate = reply.strip()
    if candidate.startswith("```"):
        candidate = candidate.split("\n", 1)[1] if "\n" in candidate else ""
        candidate = candidate.rsplit("```", 1)[0].strip()
    try:
        parsed = json.loads(candidate)
    except json.JSONDecodeError:
        return None
    return parsed if isinstance(parsed, dict) else None


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate Qwen3-4B baseline on PlanningIntent JSONL cases.")
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--prompt", type=Path, default=DEFAULT_PROMPT)
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--adapter", type=Path)
    parser.add_argument("--allow-download", action="store_true")
    parser.add_argument("--max-new-tokens", type=int, default=512)
    args = parser.parse_args()

    if not torch.cuda.is_available():
        raise RuntimeError("CUDA GPU unavailable. This baseline requires the configured NVIDIA GPU.")

    system_prompt = args.prompt.read_text(encoding="utf-8").strip()
    records = read_records(args.input)
    compute_dtype = torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16
    quantization = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=compute_dtype,
        bnb_4bit_use_double_quant=True,
    )

    print(f"Loading {args.model} in 4-bit NF4...")
    tokenizer = AutoTokenizer.from_pretrained(
        args.model,
        local_files_only=not args.allow_download,
    )
    model = AutoModelForCausalLM.from_pretrained(
        args.model,
        quantization_config=quantization,
        dtype=compute_dtype,
        device_map="auto",
        local_files_only=not args.allow_download,
    )
    if args.adapter:
        from peft import PeftModel

        model = PeftModel.from_pretrained(model, args.adapter)
    model.eval()

    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", encoding="utf-8", newline="\n") as output_file:
        for index, record in enumerate(records, start=1):
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": record["input"]},
            ]
            rendered = tokenizer.apply_chat_template(
                messages,
                tokenize=False,
                add_generation_prompt=True,
                enable_thinking=False,
            )
            model_inputs = tokenizer(rendered, return_tensors="pt").to(model.device)

            torch.cuda.synchronize()
            started_at = time.perf_counter()
            with torch.inference_mode():
                generated = model.generate(
                    **model_inputs,
                    do_sample=False,
                    max_new_tokens=args.max_new_tokens,
                )
            torch.cuda.synchronize()
            latency_ms = round((time.perf_counter() - started_at) * 1000)
            generated_ids = generated[0][model_inputs.input_ids.shape[1] :]
            reply = tokenizer.decode(generated_ids, skip_special_tokens=True).strip()
            result = {
                "id": record["id"],
                "output": parse_json(reply),
                "latencyMs": latency_ms,
                "rawText": reply,
            }
            output_file.write(json.dumps(result, ensure_ascii=False) + "\n")
            print(f"[{index}/{len(records)}] {record['id']}: {latency_ms} ms")

    print(f"Saved results to {args.output}")


if __name__ == "__main__":
    main()
