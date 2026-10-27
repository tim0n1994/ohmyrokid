# World Patch — Verified reality patches for Rokid Glasses

[中文 README](README.md)

[Preview release v0.1.0-preview.1](https://github.com/tim0n1994/ohmyrokid/releases/tag/v0.1.0-preview.1) · [MIT License](LICENSE)

> Tell the glasses what you want reality to become.

World Patch is a Rokid Glasses AIUI agent and hackathon prototype. It turns a natural-language intention into a path that can be inspected, executed step by step, and checked again:

~~~text
intent → observe → compile → diff → patch → act → verify
~~~

A normal assistant returns a suggestion. World Patch tries to return the next world change with a visible current state, target state, difference, action plan, and verification step.

## Five-minute path

1. Import this directory into [Rokid Craft](https://js.rokid.com/craft).
2. Run the agent in Craft and use the web simulator for voice, button, and return events.
3. Describe how you want the scene to change and inspect the generated next step.
4. For hardware, package the agent in Craft and upload it to [AIUI Studio](https://aiui.rokid.com/space).
5. On the glasses, update the resource package and wake the AI assistant with the agent name.

The project uses the standard AIUI agent layout: AGENTS.md, app.json, app.js, and pages/.

## Verification boundary

- The real-device path depends on a cloud resource package, phone Bluetooth relay, network access, and AIUI runtime behavior.
- The camera is suitable for scene state, not fine-grained component inspection.
- The demo is intentionally limited to roughly 4–5 multimodal calls.

This is a hackathon prototype. The repository captures the interaction model and the repeatable Craft path; hardware and network conditions determine the final device-side acceptance.