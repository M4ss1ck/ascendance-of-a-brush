# Stroke direction from a smoothed structure tensor

Curved strokes follow the edge tangent of a structure tensor, not raw gradients. Luminance comes from the source blurred at r=1. We take Sobel gradients, box-blur the tensor (Jxx, Jxy, Jyy) with r=4, and use tangent = `0.5·atan2(2Jxy, Jxx − Jyy) + π/2` and strength = sqrt of the largest eigenvalue. Raw per-pixel gradients were too noisy to trace coherent strokes.
