"""
Industrial Camera Safety Monitoring - Model Validation Script

Run this script to verify the model loads correctly and produces detections on a test video.

Usage:
    python scripts/test_video.py --video path/to/test.mp4
    python scripts/test_video.py --video path/to/test.mp4 --output output_annotated.mp4
    python scripts/test_video.py --webcam 0
"""

import argparse
import sys
import os
import time
import json

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

import cv2
import numpy as np


def load_model(repo_id: str = "Hansung-Cho/yolov8-ppe-detection"):
    """Load the YOLO model from HuggingFace."""
    try:
        from huggingface_hub import hf_hub_download
        from ultralytics import YOLO

        print(f"[INFO] Downloading model from {repo_id}...")
        model_path = hf_hub_download(repo_id=repo_id, filename="best.pt")
        print(f"[INFO] Model downloaded to: {model_path}")

        model = YOLO(model_path)
        print(f"[INFO] Model loaded successfully")
        print(f"[INFO] Model classes: {model.names}")
        return model
    except Exception as e:
        print(f"[ERROR] Failed to load model: {e}")
        sys.exit(1)


def process_video(model, source, output_path=None, show=True):
    """Process video and display/save annotated frames."""
    cap = cv2.VideoCapture(source)
    if not cap.isOpened():
        print(f"[ERROR] Cannot open video source: {source}")
        sys.exit(1)

    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    print(f"[INFO] Video: {width}x{height} @ {fps:.1f} FPS, {total_frames} frames")

    writer = None
    if output_path:
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        writer = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
        print(f"[INFO] Writing output to: {output_path}")

    # Color map for classes
    COLORS = {
        'person': (255, 165, 0),      # Orange
        'Hardhat': (0, 255, 0),        # Green
        'Safety Vest': (0, 255, 0),    # Green
        'Mask': (0, 255, 0),           # Green
        'NO-Hardhat': (0, 0, 255),     # Red
        'NO-Safety Vest': (0, 0, 255), # Red
        'NO-Mask': (0, 0, 255),        # Red
        'Safety Cone': (0, 255, 255),  # Yellow
        'machinery': (128, 128, 128),  # Gray
        'vehicle': (128, 128, 128),    # Gray
    }

    frame_count = 0
    total_detections = 0
    start_time = time.time()
    detection_summary = {}

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            frame_count += 1

            # Run inference
            results = model(frame, verbose=False)

            for result in results:
                boxes = result.boxes
                if boxes is None:
                    continue

                for box in boxes:
                    cls_id = int(box.cls[0])
                    conf = float(box.conf[0])
                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    cls_name = model.names[cls_id]

                    total_detections += 1
                    detection_summary[cls_name] = detection_summary.get(cls_name, 0) + 1

                    # Draw bounding box
                    color = COLORS.get(cls_name, (200, 200, 200))
                    cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)

                    # Draw label
                    label = f"{cls_name} {conf:.2f}"
                    label_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)[0]
                    cv2.rectangle(frame, (x1, y1 - label_size[1] - 10), (x1 + label_size[0], y1), color, -1)
                    cv2.putText(frame, label, (x1, y1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)

            # FPS overlay
            elapsed = time.time() - start_time
            current_fps = frame_count / elapsed if elapsed > 0 else 0
            cv2.putText(frame, f"FPS: {current_fps:.1f} | Frame: {frame_count}/{total_frames}",
                       (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)

            if writer:
                writer.write(frame)

            if show:
                cv2.imshow("Safety Monitor - Model Validation", frame)
                key = cv2.waitKey(1) & 0xFF
                if key == ord('q') or key == 27:
                    print("\n[INFO] Stopped by user")
                    break

            # Progress
            if frame_count % 100 == 0:
                print(f"[INFO] Processed {frame_count}/{total_frames} frames, "
                      f"{total_detections} detections, {current_fps:.1f} FPS")

    except KeyboardInterrupt:
        print("\n[INFO] Interrupted by user")
    finally:
        cap.release()
        if writer:
            writer.release()
        if show:
            cv2.destroyAllWindows()

    # Print summary
    elapsed = time.time() - start_time
    print(f"\n{'='*60}")
    print(f"VALIDATION SUMMARY")
    print(f"{'='*60}")
    print(f"Frames processed: {frame_count}")
    print(f"Total detections: {total_detections}")
    print(f"Average FPS: {frame_count / elapsed:.1f}")
    print(f"Time elapsed: {elapsed:.1f}s")
    print(f"\nDetection counts by class:")
    for cls_name, count in sorted(detection_summary.items(), key=lambda x: -x[1]):
        print(f"  {cls_name}: {count}")
    print(f"{'='*60}")

    return {
        "frames": frame_count,
        "detections": total_detections,
        "fps": frame_count / elapsed if elapsed > 0 else 0,
        "classes": detection_summary
    }


def main():
    parser = argparse.ArgumentParser(description="Test PPE detection model on video")
    parser.add_argument("--video", type=str, help="Path to input video file")
    parser.add_argument("--webcam", type=int, default=None, help="Webcam device index")
    parser.add_argument("--output", type=str, default=None, help="Path to output annotated video")
    parser.add_argument("--model", type=str, default="Hansung-Cho/yolov8-ppe-detection",
                       help="HuggingFace model repository ID")
    parser.add_argument("--no-display", action="store_true", help="Disable video display")
    parser.add_argument("--conf", type=float, default=0.35, help="Confidence threshold")
    args = parser.parse_args()

    if args.video is None and args.webcam is None:
        print("[ERROR] Specify --video <path> or --webcam <index>")
        parser.print_help()
        sys.exit(1)

    source = args.video if args.video else args.webcam
    model = load_model(args.model)

    # Set confidence threshold
    model.conf = args.conf

    print(f"\n[INFO] Starting validation on: {source}")
    print(f"[INFO] Confidence threshold: {args.conf}")
    print(f"[INFO] Press 'q' to stop\n")

    results = process_video(model, source, args.output, show=not args.no_display)

    # Save results
    results_path = os.path.join(os.path.dirname(__file__), '..', 'validation_results.json')
    with open(results_path, 'w') as f:
        json.dump(results, f, indent=2)
    print(f"\n[INFO] Results saved to: {results_path}")


if __name__ == "__main__":
    main()
