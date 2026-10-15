"""Train the current local PlanningIntent QLoRA adapter on a CUDA GPU."""

from __future__ import annotations

import argparse
import inspect
import json
from importlib.metadata import version
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
PROJECT_ROOT = ROOT.parent
DEFAULT_MODEL = "Qwen/Qwen3-4B"
DEFAULT_TRAIN = ROOT / "data" / "train.jsonl"
DEFAULT_VALIDATION = ROOT / "data" / "validation.jsonl"
DEFAULT_PROMPT = PROJECT_ROOT / "resources" / "ai" / "planning-intent.txt"
DEFAULT_OUTPUT = ROOT / "adapters" / "qwen3-4b-planning-intent"


def read_records(path: Path) -> list[dict]:
    records: list[dict] = []
    for line_number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        if not line.strip():
            continue
        record = json.loads(line)
        if not isinstance(record.get("id"), str) or not isinstance(record.get("input"), str):
            raise ValueError(f"{path}:{line_number} must contain string id and input")
        if not isinstance(record.get("output"), dict):
            raise ValueError(f"{path}:{line_number} must contain an object output")
        records.append(record)
    if not records:
        raise ValueError(f"{path} contains no records")
    return records


def as_conversations(records: list[dict], system_prompt: str) -> list[dict]:
    return [
        {
            "prompt": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": record["input"]},
            ],
            "completion": [
                {
                    "role": "assistant",
                    "content": json.dumps(record["output"], ensure_ascii=False, separators=(",", ":")),
                }
            ],
        }
        for record in records
    ]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train the current PlanningIntent QLoRA adapter.")
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--train", type=Path, default=DEFAULT_TRAIN)
    parser.add_argument("--validation", type=Path, default=DEFAULT_VALIDATION)
    parser.add_argument("--prompt", type=Path, default=DEFAULT_PROMPT)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--epochs", type=float, default=3.0)
    parser.add_argument("--max-length", type=int, default=1024)
    parser.add_argument("--max-steps", type=int, default=-1)
    parser.add_argument("--allow-download", action="store_true")
    parser.add_argument("--check-only", action="store_true")
    parser.add_argument("--preflight", action="store_true")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    train_records = read_records(args.train)
    validation_records = read_records(args.validation)
    system_prompt = args.prompt.read_text(encoding="utf-8").strip()
    print(f"training records: {len(train_records)}")
    print(f"validation records: {len(validation_records)}")
    if args.check_only:
        print("dataset loading check passed; no model was loaded")
        return

    import torch
    from datasets import Dataset
    from peft import LoraConfig, prepare_model_for_kbit_training
    from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
    from trl import SFTConfig, SFTTrainer

    if not torch.cuda.is_available():
        raise RuntimeError("CUDA GPU unavailable")

    if args.preflight:
        properties = torch.cuda.get_device_properties(0)
        sft_parameters = inspect.signature(SFTConfig).parameters
        required_parameters = {"max_length", "completion_only_loss", "eval_strategy", "warmup_steps"}
        missing = sorted(required_parameters - set(sft_parameters))
        if missing:
            raise RuntimeError(f"installed TRL SFTConfig lacks parameters: {', '.join(missing)}")
        print(f"torch: {torch.__version__}")
        print(f"transformers: {version('transformers')}")
        print(f"peft: {version('peft')}")
        print(f"trl: {version('trl')}")
        print(f"datasets: {version('datasets')}")
        print(f"bitsandbytes: {version('bitsandbytes')}")
        print(f"gpu: {properties.name}")
        print(f"gpu memory: {properties.total_memory / 1024**3:.1f} GB")
        print("QLoRA preflight passed; no model was downloaded")
        return

    use_bf16 = torch.cuda.is_bf16_supported()
    compute_dtype = torch.bfloat16 if use_bf16 else torch.float16
    quantization = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=compute_dtype,
        bnb_4bit_use_double_quant=True,
    )
    tokenizer = AutoTokenizer.from_pretrained(
        args.model,
        local_files_only=not args.allow_download,
    )
    model = AutoModelForCausalLM.from_pretrained(
        args.model,
        quantization_config=quantization,
        dtype=compute_dtype,
        device_map={"": 0},
        local_files_only=not args.allow_download,
    )
    model.config.use_cache = False
    model = prepare_model_for_kbit_training(model, use_gradient_checkpointing=True)

    lora = LoraConfig(
        r=8,
        lora_alpha=16,
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM",
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
    )
    training_args = SFTConfig(
        output_dir=str(args.output),
        max_length=args.max_length,
        max_steps=args.max_steps,
        num_train_epochs=args.epochs,
        per_device_train_batch_size=1,
        per_device_eval_batch_size=1,
        gradient_accumulation_steps=16,
        gradient_checkpointing=True,
        gradient_checkpointing_kwargs={"use_reentrant": False},
        learning_rate=2e-4,
        lr_scheduler_type="cosine",
        warmup_steps=0.1,
        fp16=not use_bf16,
        bf16=use_bf16,
        optim="paged_adamw_8bit",
        logging_steps=1,
        eval_strategy="epoch",
        save_strategy="no",
        completion_only_loss=True,
        packing=False,
        report_to="none",
        seed=42,
    )
    trainer = SFTTrainer(
        model=model,
        args=training_args,
        train_dataset=Dataset.from_list(as_conversations(train_records, system_prompt)),
        eval_dataset=Dataset.from_list(as_conversations(validation_records, system_prompt)),
        processing_class=tokenizer,
        peft_config=lora,
    )
    trainer.model.print_trainable_parameters()
    trainer.train()
    trainer.save_model(str(args.output))
    tokenizer.save_pretrained(args.output)
    print(f"adapter saved to {args.output}")


if __name__ == "__main__":
    main()
