# Model Weights Directory

This directory is for documenting model information. **Do not commit large model weight files to Git.**

## Primary Model

- **Repository**: `Hansung-Cho/yolov8-ppe-detection`
- **Framework**: Ultralytics YOLOv8
- **Classes**: Hardhat, Mask, NO-Hardhat, NO-Mask, NO-Safety Vest, Person, Safety Cone, Safety Vest, machinery, vehicle
- **Task**: Object Detection (PPE Detection)

## How Models Are Loaded

The application downloads model weights automatically from Hugging Face Hub on first startup.
Weights are cached locally by `huggingface_hub` (typically in `~/.cache/huggingface/`).

To pre-download for offline use:
```bash
python -c "from huggingface_hub import hf_hub_download; hf_hub_download('Hansung-Cho/yolov8-ppe-detection', 'best.pt')"
```

## Alternative Models

| Model | Purpose | HuggingFace Link |
|-------|---------|-----------------|
| `wesjos/Yolo-hard-hat-safety-vest` | Helmet/vest detection | [Link](https://huggingface.co/wesjos/Yolo-hard-hat-safety-vest) |
| `PekingU/rtdetr_v2_r18vd` | General object detection baseline | [Link](https://huggingface.co/PekingU/rtdetr_v2_r18vd) |

## License

Review the model card and license terms on Hugging Face before any commercial use.
