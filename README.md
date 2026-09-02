# ![Pathcraft](https://raw.githubusercontent.com/saricden/pathcraft/refs/heads/main/public/og.jpg "Pathcraft")

Pathcraft is a tech demo I built to experiment with running local small language models on a web worker. It is a generative text-based adventure game, wherein a narrative passage describing a scene in a story is written by the local LLM and 3 action options are presented to the player, who can then choose the path to take.

[***Live demo***](https://pathcraft.saricden.com/)

[![Netlify Status](https://api.netlify.com/api/v1/badges/32dfaf5d-653e-4c8c-bb18-55e8f2ef1d73/deploy-status)](https://app.netlify.com/projects/sdn-pathcraft/deploys)

**Performance note:** on lower spec consumer devices this app will run very slowly, or may even not run at all. This is because all of the AI compute is happening on-device which requires a lot of RAM and local compute.

## Game features

- Local model install process
- Generated story narrative
- Auto-saving and continue menu

## Tech stack

- Vite build tool
- ReactJS front-end
- Web worker running @huggingface/transformers
- onnx-community/Llama-3.2-1B-Instruct-ONNX model

## Installing locally

```bash
git clone git@github.com:saricden/pathcraft.git # Clone the repository to your machine
cd pathcraft # Open the new directory
npm install # Install npm dependencies
npm run dev # Boot up the local dev server
```
