import { cdk8s, TextFile, JsonPatch } from "projen";
import { DataDogMonitorPropsBuilder } from "./projenrc/PropBuilders";
const project = new cdk8s.Cdk8sTypeScriptApp({
  cdk8sVersion: "2.3.33",
  k8sMinorVersion: 25, // CDK8s+ version
  name: "cdk8s-sample-app",
  defaultReleaseBranch: "main",
  projenrcTs: true,
  prettier: true,
  deps: ["@vincentgna/cdk8s-datadog", "@mrgrain/jsii-struct-builder"],
  workflowBootstrapSteps: [
    {
      run: 'echo "//npm.pkg.github.com/:_authToken=${{ secrets.GITHUB_TOKEN }}" > ~/.npmrc',
    },
  ],
});
project.npmrc.addRegistry("https://npm.pkg.github.com/", "@vincentgna");
new TextFile(project, ".nvmrc", {
  lines: ["v18"],
});
// projen escape hatch
// only CodeArtifact support by `scopedPackagesOptions`
const buildWorkflowYaml = project.tryFindObjectFile(
  ".github/workflows/build.yml",
);
buildWorkflowYaml?.patch(
  JsonPatch.add("/jobs/build/permissions/packages", "read"),
);
const upgradeWorkflowYaml = project.tryFindObjectFile(
  ".github/workflows/upgrade.yml",
);
upgradeWorkflowYaml?.patch(
  JsonPatch.add("/jobs/upgrade/permissions/packages", "read"),
);

// Generate strongly typed DataDogMonitorProps
new DataDogMonitorPropsBuilder(project);
project.synth();
