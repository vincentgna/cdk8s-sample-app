import { cdk8s, TextFile } from "projen";
const project = new cdk8s.Cdk8sTypeScriptApp({
  cdk8sVersion: "2.3.33",
  k8sMinorVersion: 25, // CDK8s+ version
  name: "cdk8s-sample-app",
  defaultReleaseBranch: "main",
  projenrcTs: true,
  prettier: true,
});
new TextFile(project, ".nvmrc", {
  lines: ["v18"],
});
project.synth();
