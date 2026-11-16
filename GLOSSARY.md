# Ascendance of a Brush

A deterministic painter: it turns an image into a painting made of brush strokes, entirely in the browser, and the same inputs always give the same painting.

## Inputs

**Source**:
The image the user uploads, resampled to the working size.
_Avoid_: input, photo, original

**Working size**:
The long-side pixel size, chosen from fixed presets, at which a painting is planned, rendered and exported.
_Avoid_: resolution, output size

**Selection**:
What the user chooses to paint: the whole image, a shape (rectangle, ellipse, polygon) or a pencil outline.
_Avoid_: region, area, crop

**Mask**:
The pixel set a selection resolves to. A stroke may only start inside it.

**Seed**:
The integer that, with the source and settings, fully determines a painting.

## Planning

**Analysis**:
Everything derived from the source before any stroke is placed: references, flow and palette.

**Layer**:
One coarse-to-fine pass of the planner, with a single brush radius and its own reference.
_Avoid_: pass, level

**Brush radius**:
The size R of the brush in a layer. It halves from one layer to the next, never below 1.5 px.

**Reference**:
The source blurred to match a layer's brush radius. It is what that layer tries to paint.
_Avoid_: target, blurred image

**Flow**:
The edge-tangent direction field that curved strokes follow.
_Avoid_: gradient field, orientation

**Threshold**:
How far the canvas must differ from the reference in a grid cell before that cell gets a stroke.

**Tolerance**:
How far the reference color may drift from a curved stroke's start color before the stroke stops growing.

**Palette**:
An optional small set of colors that every stroke color snaps to.

**Plan**:
The ground plus the ordered stroke list for one painting.

## Painting

**Stroke**:
A single application of paint, recorded as plain data (shape, color, opacity and, for curved strokes, its own seed) so it can be redrawn exactly.
_Avoid_: mark, dab (except for the Dab brush)

**Stroke list**:
All strokes of a plan, in paint order. It is the contract between planner and renderer.

**Brush**:
A kind of stroke. There are two: **Dab** (a round blob) and **Curved** (an edge-aware stroke along the flow).

**Bristle**:
One of the thin lines that give a curved stroke its texture.

**Ground**:
What the canvas holds before the first stroke: white, toned, or a blurred underpainting.
_Avoid_: background, base

**Bleed**:
The part of a stroke that extends past the mask outline.

**Painting**:
The rendered result of a plan.
_Avoid_: output, artwork, render

**Replay**:
Redrawing a painting from its stored stroke list alone.

**Timelapse**:
A video of a replay, one batch of strokes per frame.

## Quality

**Error**, **Edge error**, **Line error**:
The three scores that measure how far a painting drifts from its source overall, on strong edges, and on thin lines and small spots. Lower is better.
