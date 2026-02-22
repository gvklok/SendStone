"""
export_onnx.py — Run once on dev machine to produce models/sendit_v2.onnx

Usage:
    python export_onnx.py

Requires: torch, sendit_v2_model.py, models/sendit_v2_model.pth
Output:   models/sendit_v2.onnx  (~2-4 MB, no PyTorch needed to run it)
"""

import sys
import os
import torch
import onnx

# Ensure sendit_v2_model.py is importable from this folder
sys.path.insert(0, os.path.dirname(__file__))
from sendit_v2_model import SENDITv2, CNN_CHANNELS, CNN_HEIGHT, CNN_WIDTH

PTH_PATH  = os.path.join(os.path.dirname(__file__), 'models', 'sendit_v2_model.pth')
ONNX_PATH = os.path.join(os.path.dirname(__file__), 'models', 'sendit_v2.onnx')

print(f"Loading weights from {PTH_PATH} ...")
model = SENDITv2()
model.load_state_dict(torch.load(PTH_PATH, map_location='cpu', weights_only=True))
model.eval()

# Dummy inputs matching exact shapes the model expects (batch size = 1)
dummy_inputs = (
    torch.zeros(1, CNN_CHANNELS, CNN_HEIGHT, CNN_WIDTH),  # grid  (1, 4, 20, 22)
    torch.zeros(1, 1),                                    # angle (1, 1)
    torch.zeros(1, 21),                                   # hold features
    torch.zeros(1, 10),                                   # spacing features
    torch.zeros(1, 12),                                   # movement features
    torch.zeros(1, 8),                                    # interaction features
)

print(f"Exporting to {ONNX_PATH} ...")
torch.onnx.export(
    model,
    dummy_inputs,
    ONNX_PATH,
    input_names=['grid', 'angle', 'hold', 'spacing', 'movement', 'interaction'],
    output_names=['grade'],
    opset_version=17,
    verbose=False,
)

# Verify the exported model is valid
onnx_model = onnx.load(ONNX_PATH)
onnx.checker.check_model(onnx_model)

size_mb = os.path.getsize(ONNX_PATH) / (1024 * 1024)
print(f"✓ Exported and verified: {ONNX_PATH} ({size_mb:.1f} MB)")
print("  Ship this file to the Pi — no PyTorch needed there, just onnxruntime.")
