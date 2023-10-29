# Sample CDK8s App

## Synth to Kubernetes Manifests

```sh
nvm use
yarn

alias pj="npx projen@latest"
pj build
```

## Deploy

```sh
kubectl apply -f dist/
```
