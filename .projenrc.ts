import { cdk8s } from 'projen';
const project = new cdk8s.Cdk8sTypeScriptApp({
  cdk8sVersion: '2.3.33',
  defaultReleaseBranch: 'main',
  name: 'cdk8s-sample-app',
  projenrcTs: true,
  deps: ['@vincentgna/cdk8s-datadog'],
});
project.synth();
