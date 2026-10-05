import cv2
import numpy as np
import os
from typing import Tuple, List, Dict, Any


class PersonDetector:
    """
    Computer Vision service that detects humans in camera frames
    using an ensemble of OpenCV's HOG Pedestrian Detector, Upper/Full Body
    Haar Cascades, and Frontal Face Cascade with Non-Maximum Suppression (NMS).
    """

    def __init__(self):
        # 1. HOG (Histogram of Oriented Gradients) Pedestrian Descriptor + Linear SVM
        self.hog = cv2.HOGDescriptor()
        self.hog.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())

        # 2. Haar Cascades for indoor/partial human detection (upper body, full body, face)
        cascades_path = cv2.data.haarcascades
        self.face_cascade = cv2.CascadeClassifier(os.path.join(cascades_path, 'haarcascade_frontalface_default.xml'))
        self.upper_cascade = cv2.CascadeClassifier(os.path.join(cascades_path, 'haarcascade_upperbody.xml'))
        self.full_cascade = cv2.CascadeClassifier(os.path.join(cascades_path, 'haarcascade_fullbody.xml'))

    def detect_person(self, image_bytes: bytes) -> Dict[str, Any]:
        """
        Analyzes JPEG image bytes to identify if any person/human is present.
        Returns detection metadata and an annotated image with bounding boxes.
        """
        try:
            nparr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if img is None:
                return {
                    "person_detected": False,
                    "count": 0,
                    "labels": [],
                    "annotated_bytes": image_bytes,
                }

            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            detections: List[Tuple[int, int, int, int, str, float]] = []

            # A. HOG People Detector
            try:
                rects, weights = self.hog.detectMultiScale(
                    gray,
                    winStride=(4, 4),
                    padding=(8, 8),
                    scale=1.05
                )
                for (x, y, w, h), weight in zip(rects, weights):
                    # Filter low-confidence HOG hits
                    if float(weight) > 0.15:
                        detections.append((int(x), int(y), int(w), int(h), "Persona", float(weight)))
            except Exception as e:
                print(f"[PersonDetector] HOG error: {e}")

            # B. Upper Body Cascade (very reliable for seated/torso indoor shots)
            try:
                upper_bodies = self.upper_cascade.detectMultiScale(
                    gray,
                    scaleFactor=1.1,
                    minNeighbors=3,
                    minSize=(40, 40)
                )
                for (x, y, w, h) in upper_bodies:
                    detections.append((int(x), int(y), int(w), int(h), "Torso Humano", 0.7))
            except Exception as e:
                print(f"[PersonDetector] UpperBody cascade error: {e}")

            # C. Full Body Cascade
            try:
                full_bodies = self.full_cascade.detectMultiScale(
                    gray,
                    scaleFactor=1.1,
                    minNeighbors=3,
                    minSize=(40, 60)
                )
                for (x, y, w, h) in full_bodies:
                    detections.append((int(x), int(y), int(w), int(h), "Cuerpo Humano", 0.8))
            except Exception as e:
                print(f"[PersonDetector] FullBody cascade error: {e}")

            # D. Frontal Face Cascade (confirms human presence if facing camera)
            try:
                faces = self.face_cascade.detectMultiScale(
                    gray,
                    scaleFactor=1.1,
                    minNeighbors=4,
                    minSize=(30, 30)
                )
                for (x, y, w, h) in faces:
                    detections.append((int(x), int(y), int(w), int(h), "Rostro Humano", 0.9))
            except Exception as e:
                print(f"[PersonDetector] Face cascade error: {e}")

            if not detections:
                return {
                    "person_detected": False,
                    "count": 0,
                    "labels": [],
                    "annotated_bytes": image_bytes,
                }

            # Non-Maximum Suppression to merge overlapping boxes
            boxes = [[d[0], d[1], d[0] + d[2], d[1] + d[3]] for d in detections]
            scores = [d[5] for d in detections]
            indices = cv2.dnn.NMSBoxes(
                bboxes=[[d[0], d[1], d[2], d[3]] for d in detections],
                scores=scores,
                score_threshold=0.2,
                nms_threshold=0.4
            )

            final_detections = []
            if len(indices) > 0:
                indices_flat = indices.flatten() if hasattr(indices, 'flatten') else indices
                for idx in indices_flat:
                    final_detections.append(detections[idx])
            else:
                final_detections = detections

            annotated_img = img.copy()
            labels_found = []

            for (x, y, w, h, label, score) in final_detections:
                labels_found.append(label)

                # Draw high-visibility tactical bounding box
                color = (0, 74, 198) if "Persona" in label else (37, 99, 235)  # Sentinel Blue
                cv2.rectangle(annotated_img, (x, y), (x + w, y + h), color, 2)

                # Label tag banner
                tag = f"{label} ({int(score * 100)}%)"
                (tw, th), baseline = cv2.getTextSize(tag, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
                cv2.rectangle(
                    annotated_img,
                    (x, max(0, y - th - 8)),
                    (x + tw + 6, max(th + 8, y)),
                    color,
                    cv2.FILLED
                )
                cv2.putText(
                    annotated_img,
                    tag,
                    (x + 3, max(th + 2, y - 4)),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.45,
                    (255, 255, 255),
                    1,
                    cv2.LINE_AA
                )

            # Re-encode to JPEG
            success, enc_bytes = cv2.imencode('.jpg', annotated_img, [int(cv2.IMWRITE_JPEG_QUALITY), 90])
            result_bytes = enc_bytes.tobytes() if success else image_bytes

            return {
                "person_detected": len(final_detections) > 0,
                "count": len(final_detections),
                "labels": list(set(labels_found)),
                "annotated_bytes": result_bytes,
            }

        except Exception as e:
            print(f"[PersonDetector] Error general de detección: {e}")
            return {
                "person_detected": False,
                "count": 0,
                "labels": [],
                "annotated_bytes": image_bytes,
            }


person_detector = PersonDetector()
