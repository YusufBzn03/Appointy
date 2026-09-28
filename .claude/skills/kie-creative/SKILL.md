---
name: kie-creative
description: >-
  Create and edit images and videos through the pje-creative-mcp server (KIE.ai).
  Use when the task involves generating imagery, editing an existing image,
  animating a still into a video, restyling or lip-syncing a video, upscaling,
  or producing social, product or cinematic assets.
---

# KIE Creative

How to use the `pje-creative-mcp` tools well. Everything here reflects what the
KIE.ai API actually supports — if a capability is not listed, assume it is not
available and check `list_models` / `get_model` before promising it.

## The core loop

Every generation tool returns a **task id immediately**, not a finished asset:

1. `generate_image` / `edit_image` / `generate_video` / `image_to_video` /
   `video_to_video` / `upscale_image` → `{ task_id, status: "queued" }`
2. `wait_for_task` → polls until `completed` or `failed`, returns `results[].url`
3. `download_result` → saves the file locally

**Always finish with `download_result` for anything the user will keep.** KIE
result URLs are temporary. If a download fails because a URL expired, retry with
`refresh_url: true`, which asks KIE for a fresh 20-minute link.

Timeouts: images usually complete in well under 120 s. Videos commonly need
300–900 s — pass `timeout_seconds: 600` or more to `wait_for_task`. A timeout
does **not** cancel the task; call `get_task` later with the same id.

Local files are first-class: pass an absolute path anywhere an image, video or
audio input is expected. The server uploads it to KIE and substitutes the URL.
You never need `upload_file` for a single task — reach for it only when reusing
one upload across several tasks.

## Choosing a tool

| Situation | Tool |
|---|---|
| Nothing exists yet, need a still | `generate_image` |
| A source image exists (including one you just made) | `edit_image` |
| Need motion and you have or can make a key frame | `image_to_video` (preferred) |
| Need motion with no usable still | `generate_video` |
| Restyle an existing video, or lip-sync it to audio | `video_to_video` |
| Print/large format, or background removal | `upscale_image` |
| Unsure what a model accepts | `get_model` |

**Prefer image → video over text → video.** A still fixes framing, styling and
product accuracy; text-to-video re-invents all three on every run. The standard
route to a controlled clip is `generate_image` → `image_to_video`.

## Model selection

Call `list_models` when the brief has format constraints (a 9:16 reel, a
15-second clip, 4K output). Highlights:

**Images**
- `google/nano-banana` — fast, reliable default for concepts and social stills.
- `nano-banana-2` — highest detail tier: up to 4K, up to 14 reference images.
  Use for hero and product imagery.
- `nano-banana-pro` — pro tier, up to 8 reference images, up to 4K.
- `bytedance/seedream-v4-text-to-image` — commercial/product look, and the only
  image model that returns **up to 6 images from one task** (`number_of_images`).
- `seedream/5-pro-text-to-image` — Seedream 5 quality tier (`resolution` 1K/2K).
- `flux-2/pro-text-to-image` — strong general aesthetic, 1K/2K.
- `gpt-image/1.5-text-to-image` — best for **text rendered inside the image**,
  but only 1:1, 2:3 and 3:2 are available.
- `google/imagen4` / `-fast` / `-ultra` — photoreal, supports `negative_prompt`.
- `ideogram/v3-text-to-image` — typography and graphic design; `style` option.
- `qwen3/text-to-image` — Chinese and English prompts, `negative_prompt`.

**Image editing**
- `google/nano-banana-edit` — general editing, up to 10 input images.
- `nano-banana-2` / `nano-banana-pro` — editing with many references at high res.
- `bytedance/seedream-v4-edit` — up to 10 inputs, up to 6 variants per task.
- `flux-2/pro-image-to-image` — 1–8 references; `aspect_ratio: "auto"` matches
  the first input image.
- `ideogram/v3-edit` — **the only masked inpainting model**. Needs a `mask` whose
  dimensions match the source image.

**Video**
- `veo-3-1` — cinematic flagship with native audio. Durations 4 / 6 / 8 s,
  up to 4K, 16:9 or 9:16 only. Two images = first and last frame.
- `kling/v3-turbo-text-to-video` / `-image-to-video` — widest duration range
  (3–15 s), 720p/1080p. Good default.
- `kling/v2-5-turbo-text-to-video-pro` — supports `negative_prompt` and
  `cfg_scale`.
- `bytedance/seedance-1.5-pro` — one model for both modes (0 images = text, 1–2
  images = image-to-video), 4–12 s, optional `generate_audio`, `fixed_lens` to
  lock the camera.
- `wan/2-6-text-to-video` / `-image-to-video` — up to 15 s, 1080p default.
- `pixverse-v6/text-to-video` / `-image-to-video` — 1–15 s, down to 360p,
  optional synced audio.
- `hailuo/2-3-image-to-video-pro` — 6 or 10 s (10 s not available at 1080P).
- `grok-imagine/text-to-video` / `-image-to-video` — long clips, 6–30 s.

**Video to video**
- `wan/2-6-video-to-video` — prompt-driven restyle.
- `runway/gen4-aleph` — Runway transformation, optional `reference_image`.
- `volcengine/video-to-video-lip-sync` — lip sync. Needs `audio`, takes **no**
  prompt.

**Finishing**
- `topaz/image-upscale` (factor 1/2/4), `recraft/crisp-upscale` (no factor),
  `recraft/remove-background`.

## Aspect ratios for social

| Placement | Ratio |
|---|---|
| Instagram / TikTok reel, story, Shorts | `9:16` |
| Instagram feed, square ad | `1:1` |
| Instagram portrait feed | `4:5` (images only; most video models lack it) |
| YouTube, web hero, landscape ad | `16:9` |
| Cinematic banner | `21:9` (Seedream, Nano Banana, Bytedance, PixVerse) |

Supported ratios differ per model — Veo 3.1 only does 16:9 / 9:16 / Auto, and
GPT Image 1.5 only does 1:1 / 2:3 / 3:2. When in doubt, `get_model` first.

## Writing image prompts

Write a scene, not a label. Cover, roughly in this order:

- **Subject** — who or what, and its defining detail
- **Environment** — where, and what surrounds it
- **Composition** — framing, placement, negative space, depth layers
- **Camera and lens** — e.g. "85 mm portrait lens, shallow depth of field",
  "24 mm wide, low angle"
- **Lighting** — direction, quality, colour temperature, practicals
- **Materials and surfaces** — texture, finish, wear, reflectivity
- **Atmosphere** — haze, dust, weather, mood
- **Realism level** — photographic, editorial, illustrated, rendered

Avoid "AI image", "4k, 8k, masterpiece, trending on artstation" style keyword
soup. It adds noise without direction.

> A single ceramic espresso cup on a brushed-steel counter in a quiet morning
> café. Shot on an 85 mm lens at f/2, tight three-quarter framing with the cup
> slightly right of centre and generous negative space to the left. Low, raking
> sunlight from a window at frame left rims the cup's edge and throws a long
> soft shadow; matte unglazed ceramic against cool polished steel. Faint steam,
> fine dust in the light beam. Editorial food photography, natural colour.

Use `negative_prompt` only on models that support it (Imagen 4, Qwen3,
Ideogram v3, Kling V2.5 Turbo Pro).

## Writing video prompts

An image prompt describes a frame; a video prompt must describe **change**.
Include everything from the image list, plus:

- **Action** — what the subject does, start to finish
- **Camera movement** — push in, pull back, orbit, handheld drift, static lock
- **Subject movement** — pace and direction
- **Environment movement** — steam, fabric, foliage, traffic, particles
- **Timing** — what happens in the first second versus the last
- **Cinematic characteristics** — shutter feel, grain, colour grade, lens flare

> The espresso cup sits still as steam rises and curls slowly to the left. The
> camera pushes in gently and steadily over the full clip, ending on a tight
> framing of the rim. Sunlight shifts a fraction as thin cloud passes, softening
> the rim light near the end. Dust drifts through the beam. Locked, deliberate
> movement — no handheld shake. Warm natural grade, subtle film grain.

Keep one clear action per clip. If the brief needs several beats, generate
several clips and note that they are meant to be edited together.

To lock the camera, use the model's own field via `options`:
`fixed_lens: true` (Seedance) or `camera_fixed: true` (Bytedance V1 Pro).

## Reference images

`reference_images` on `generate_image` and the `image` argument on `edit_image`
accept local paths or URLs. Only models with `supports_reference_images: true`
accept them — check `list_models`.

- **Style reference**: pass the reference and describe the *new* subject in the
  prompt, naming the qualities to carry over ("same muted palette and soft
  window light").
- **Subject consistency**: pass the subject image and describe only what should
  change ("same product, now on a marble surface in daylight"). State explicitly
  what must stay identical — that is what keeps the product accurate.
- **Multi-image composition**: Nano Banana 2 (14), Nano Banana Edit (10),
  Seedream 4 Edit (10), Flux-2 Pro (8) accept several at once. Refer to them in
  the prompt by what they are, not by index.
- **Masked edits**: only `ideogram/v3-edit`, and the mask must match the source
  image dimensions.

## Image → video workflow

1. `generate_image` with the final aspect ratio and the highest resolution the
   model offers. Review it before spending video credits — a video inherits every
   flaw in its key frame.
2. `edit_image` if anything needs fixing. Iterate on stills; they are cheap and
   fast compared with video.
3. `download_result` the approved still (optional but useful for the record).
4. `image_to_video`, passing the still and a prompt that describes **motion
   only** — the still already carries the look.
5. `wait_for_task` with `timeout_seconds: 600`.
6. `download_result` for the clip.

For a first-and-last-frame transition, use `veo-3-1` and pass two images.

## Saving results

```
download_result(url: "<result url>", output_path: "campaign/hero-9x16.mp4")
```

Relative paths resolve inside the server's output directory (`PJE_OUTPUT_DIR`,
default `./output`); missing directories are created. Paths that escape that
directory are refused. Existing files are never replaced unless you pass
`overwrite: true`. Use descriptive names that carry the ratio and variant, so a
set of assets stays legible later.

## Handling errors

Tools return `{ success: false, error: { code, message, hint } }` instead of
throwing. What to do per code:

| Code | Action |
|---|---|
| `MISSING_API_KEY` | Tell the user to set `KIE_API_KEY`. Do not retry. |
| `INVALID_MODEL` | Read `details.alternatives`, pick a model that has the capability. |
| `UNSUPPORTED_PARAMETER` | The model does not accept that argument. Drop it, or switch to a model that does — the hint lists what is supported. |
| `INVALID_PARAMETER` | Use a value from `details.accepted_values`. |
| `INSUFFICIENT_CREDITS` | Call `get_credits`, report the balance, stop. Do not retry. |
| `RATE_LIMITED` | Wait, then retry once. Do not loop. |
| `TIMEOUT` | The task is still running. Call `get_task` with the same id, or `wait_for_task` again with a larger timeout. |
| `GENERATION_FAILED` / task `status: "failed"` | Read `failure.message`. Content-policy rejections need a rephrased prompt, not a retry. |
| `DOWNLOAD_FAILED` | Retry `download_result` with `refresh_url: true`; if that fails, re-query the task for a current URL. |
| `FILE_EXISTS` | Choose a different `output_path` or pass `overwrite: true`. |

Never retry the same failing call unchanged — each attempt costs credits.

## Cost discipline

Video generation is the expensive operation. Before a batch:

- Settle the concept on stills first.
- Check `get_credits` before a long run.
- Generate one clip, review it, then scale — do not fan out variations blind.
- Prefer lower resolutions (480p/720p) while iterating, full resolution only for
  the approved version.

## Not available through this server

Do not offer these — KIE exposes them, but this server does not implement them:
music and speech generation (Suno, ElevenLabs), chat/LLM models, avatar and
talking-head models, and the legacy dedicated 4o-image / flux-kontext endpoints.
Video *extension* (Veo, PixVerse, Grok) is likewise not exposed.
